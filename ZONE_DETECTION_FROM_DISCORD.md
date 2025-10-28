# Zone Detection from Discord Event Descriptions

## Overview

The system automatically detects event zones (SKY, LIMBUS, SEA, HENM, DYNAMIS) from Discord Raid-Helper event descriptions by parsing Discord custom emoji codes. This enables automatic filtering of boss dropdowns to show only relevant bosses for each event type.

## How It Works

### 1. Discord Event Setup

Event organizers use Discord custom emojis in the event description to spell out the zone:

```
<:S:675573196396691496> <:K:675573195352440843> <:Y:675573196191432725>
```

Each emoji contains a letter (S, K, Y) which spells out "SKY".

### 2. n8n Parser Extraction

The n8n workflow includes a custom JavaScript parser (`n8n-parse-raid-helper-WITH-ZONE.js`) that:

1. Extracts all letter emoji codes using regex: `/<:([A-Z]):\d+>/g`
2. Concatenates the letters: "S" + "K" + "Y" = "SKY"
3. Checks if it matches a valid single zone: SKY, LIMBUS, SEA, HENM, or DYNAMIS
4. If multiple valid zones are detected (e.g., "SKY LIMBUS"), labels as "Other"
5. If no valid zones are detected, labels as "Other"

### 3. Webhook Payload

The n8n parser sends the detected zone as `event_type` in the webhook payload:

```json
{
  "event_id": "1430659377156591667",
  "action": "created",
  "event": {
    "title": "2x Sky Gods",
    "description": "**<:S:...> <:K:...> <:Y:...>**\n\n2x All Gods for Sales",
    "event_type": "SKY",
    "start_time": "2025-10-28T18:00:00.000Z",
    "end_time": "2025-10-28T21:00:00.000Z",
    "channel_id": "...",
    "message_id": "...",
    "signups": [...]
  }
}
```

### 4. Backend Storage

The backend webhook handler (`server.js:3807-3908`) stores the `event_type` in the database:

```sql
INSERT INTO events (
    event_name,
    event_type,  -- "SKY", "LIMBUS", "SEA", "HENM", "DYNAMIS", or "Other"
    event_date,
    ...
) VALUES (...)
```

### 5. Boss Filtering

When users add bosses to an event, the frontend calls `/api/events/:eventId/zone-mobs` which:

**For specific zones (SKY, LIMBUS, SEA, HENM, DYNAMIS):**
```sql
SELECT m.dropId, m.mob_name, z.zone_name, z.zone_category, m.mob_type, m.mob_level
FROM mobs m
JOIN zones z ON m.zone_id = z.id
WHERE z.zone_category = 'SKY'  -- Only SKY bosses
ORDER BY z.zone_name, m.mob_name
```

**For "Other" events:**
```sql
SELECT m.dropId, m.mob_name, z.zone_name, z.zone_category, m.mob_type, m.mob_level
FROM mobs m
JOIN zones z ON m.zone_id = z.id
-- No WHERE clause - returns ALL bosses
ORDER BY z.zone_name, m.mob_name
```

## Valid Zones

### Single Zones (Specific Boss Filtering)

| Zone | Description | Example Discord Emojis |
|------|-------------|------------------------|
| **SKY** | Sky/Gods events | `<:S:...> <:K:...> <:Y:...>` |
| **LIMBUS** | Limbus events | `<:L:...> <:I:...> <:M:...> <:B:...> <:U:...> <:S:...>` |
| **SEA** | Sea/Jailer events | `<:S:...> <:E:...> <:A:...>` |
| **HENM** | HENM events | `<:H:...> <:E:...> <:N:...> <:M:...>` |
| **DYNAMIS** | Dynamis events | `<:D:...> <:Y:...> <:N:...> <:A:...> <:M:...> <:I:...> <:S:...>` |

### Multi-Zone Events (All Bosses Available)

If the description contains **multiple valid zones**, it's labeled as "Other":

**Example:**
```
<:S:...> <:K:...> <:Y:...>  <:S:...> <:E:...> <:A:...>
```
Extracted: "SKYSEA" → Detected zones: SKY + SEA → Result: **"Other"**

**Why?** The event spans multiple content types, so all bosses should be available.

## Zone Database Schema

### zones table

```sql
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) UNIQUE NOT NULL,
    zone_category VARCHAR(50),  -- 'SKY', 'LIMBUS', 'DYNAMIS', 'SEA', 'ABYSSEA', etc.
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
```sql
id  |           zone_name            | zone_category
-----+--------------------------------+---------------
130 | RuAun_Gardens                  | SKY
177 | VeLugannon_Palace              | SKY
178 | The_Shrine_of_RuAvitau         | SKY
180 | LaLoff_Amphitheater            | SKY
181 | The_Celestial_Nexus            | SKY
37  | Temenos                        | LIMBUS
38  | Apollyon                       | LIMBUS
33  | AlTaieu                        | SEA
34  | Grand_Palace_of_HuXzoi         | SEA
35  | The_Garden_of_RuHmet           | SEA
39  | Dynamis-Valkurm                | DYNAMIS
40  | Dynamis-Buburimu               | DYNAMIS
```

### mobs table

```sql
CREATE TABLE mobs (
    dropid INTEGER PRIMARY KEY,
    mob_name VARCHAR(100) NOT NULL,
    zone_id INTEGER REFERENCES zones(id),
    mob_level INTEGER,
    mob_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
```sql
 dropid |     mob_name     |       zone_name        | zone_category
--------+------------------+------------------------+---------------
    123 | Genbu            | RuAun_Gardens          | SKY
    124 | Seiryu           | RuAun_Gardens          | SKY
    125 | Byakko           | RuAun_Gardens          | SKY
    126 | Suzaku           | RuAun_Gardens          | SKY
    127 | Kirin            | The_Shrine_of_RuAvitau | SKY
```

## n8n Parser Logic

### Full Parser Code (`n8n-parse-raid-helper-WITH-ZONE.js`)

```javascript
function extractZoneFromDescription(description) {
  if (!description) {
    return 'Other';
  }

  // Extract letters from Discord custom emoji codes
  // Pattern: <:LETTER:number> where LETTER is the actual letter
  const emojiPattern = /<:([A-Z]):\d+>/g;
  const matches = description.matchAll(emojiPattern);

  let extractedLetters = '';
  for (const match of matches) {
    extractedLetters += match[1]; // Add the letter (group 1)
  }

  console.log(`Raw description: ${description.substring(0, 200)}`);
  console.log(`Extracted letters from emojis: "${extractedLetters}"`);

  // Clean up extracted text - remove spaces and convert to uppercase
  const cleanText = extractedLetters.toUpperCase().replace(/\s+/g, '');

  // Check for exact matches first (single zones)
  const validSingleZones = ['SKY', 'LIMBUS', 'SEA', 'HENM', 'DYNAMIS'];

  if (validSingleZones.includes(cleanText)) {
    console.log(`✓ Single zone match: ${cleanText}`);
    return cleanText;
  }

  // Check for combination zones (multiple valid zones mentioned)
  const foundZones = validSingleZones.filter(zone => cleanText.includes(zone));

  if (foundZones.length === 1) {
    console.log(`✓ Single zone found in text: ${foundZones[0]}`);
    return foundZones[0];
  } else if (foundZones.length > 1) {
    // Multiple zones = "Other"
    console.log(`✓ Multiple zones detected: ${foundZones.join(', ')} -> Other`);
    return 'Other';
  }

  // No recognized zone
  console.log(`✗ No recognized zone, defaulting to Other`);
  return 'Other';
}
```

### Parser Output Examples

#### Example 1: SKY Event
**Input Description:**
```
**<:S:675573196396691496> <:K:675573195352440843> <:Y:675573196191432725> **

2x All Gods for Sales
```

**Parser Output:**
```json
{
  "event_type": "SKY"
}
```

**Console Logs:**
```
Raw description: **<:S:675573196396691496> <:K:675573195352440843> <:Y:675573196191432725> **...
Extracted letters from emojis: "SKY"
✓ Single zone match: SKY
```

#### Example 2: DYNAMIS Event
**Input Description:**
```
**<:D:...> <:Y:...> <:N:...> <:A:...> <:M:...> <:I:...> <:S:...>**

Dynamis-Xarcabard Run
```

**Parser Output:**
```json
{
  "event_type": "DYNAMIS"
}
```

#### Example 3: Multi-Zone Event
**Input Description:**
```
**<:S:...> <:K:...> <:Y:...> + <:S:...> <:E:...> <:A:...>**

Sky and Sea Farming
```

**Parser Output:**
```json
{
  "event_type": "Other"
}
```

**Console Logs:**
```
Raw description: **<:S:...> <:K:...> <:Y:...> + <:S:...> <:E:...> <:A:...>**...
Extracted letters from emojis: "SKYSEA"
✓ Multiple zones detected: SKY, SEA -> Other
```

#### Example 4: Unrecognized Event
**Input Description:**
```
Weekly LS Meeting

No emojis here
```

**Parser Output:**
```json
{
  "event_type": "Other"
}
```

**Console Logs:**
```
Raw description: Weekly LS Meeting...
Extracted letters from emojis: ""
✗ No recognized zone, defaulting to Other
```

## Backend API Endpoints

### POST /api/webhooks/raid-helper

**Accepts Payload:**
```json
{
  "event_id": "1430659377156591667",
  "action": "created",
  "event": {
    "title": "Sky Event",
    "description": "...",
    "event_type": "SKY",  // ← Parsed by n8n
    "start_time": "2025-10-28T18:00:00.000Z",
    "signups": [...]
  }
}
```

**Handler Logic (server.js:3807-3908):**
```javascript
async function handleEventCreateOrUpdate(event_id, eventData) {
    const {
        title,
        description = '',
        event_type = 'Sky', // Default to Sky if not provided by n8n
        start_time,
        ...
    } = eventData;

    // Insert or update event with event_type
    await pool.query(`
        INSERT INTO events (
            event_name,
            event_type,  // ← Stored in database
            event_date,
            ...
        ) VALUES ($1, $2, $3, ...)
    `, [title, event_type, start_time, ...]);
}
```

### GET /api/events/:eventId/zone-mobs

**Purpose:** Returns bosses available for an event based on its zone.

**Request:**
```
GET /api/events/42/zone-mobs
```

**Logic (server.js:1489-1533):**
```javascript
const eventType = eventResult.rows[0]?.event_type || 'SKY';

if (eventType.toUpperCase() === 'OTHER') {
    // Return ALL mobs
    query = `SELECT m.dropId, m.mob_name, z.zone_name, z.zone_category, ...
             FROM mobs m JOIN zones z ON m.zone_id = z.id
             ORDER BY z.zone_name, m.mob_name`;
} else {
    // Filter by specific zone category
    query = `SELECT m.dropId, m.mob_name, z.zone_name, z.zone_category, ...
             FROM mobs m JOIN zones z ON m.zone_id = z.id
             WHERE z.zone_category = UPPER($1)
             ORDER BY z.zone_name, m.mob_name`;
    params = [eventType]; // e.g., 'SKY'
}
```

**Response (SKY event):**
```json
[
  {
    "dropid": 123,
    "mob_name": "Genbu",
    "zone_name": "RuAun_Gardens",
    "zone_category": "SKY",
    "mob_type": "NM",
    "mob_level": 99
  },
  {
    "dropid": 124,
    "mob_name": "Seiryu",
    "zone_name": "RuAun_Gardens",
    "zone_category": "SKY",
    "mob_type": "NM",
    "mob_level": 99
  }
]
```

**Response (Other event):**
```json
[
  // ALL mobs from ALL zones
  {"dropid": 123, "mob_name": "Genbu", "zone_category": "SKY", ...},
  {"dropid": 200, "mob_name": "Temenos Boss", "zone_category": "LIMBUS", ...},
  {"dropid": 300, "mob_name": "Jailer of Hope", "zone_category": "SEA", ...},
  ...
]
```

## Frontend Integration

The frontend automatically uses the filtered boss list when users click "Add Boss" in an event's details page. The API call is already integrated - no frontend changes were needed.

## Testing

### Test Case 1: Single Zone Detection
**Discord Description:**
```
<:S:123> <:K:456> <:Y:789>
```
**Expected:** `event_type = "SKY"`

### Test Case 2: Multi-Zone Detection
**Discord Description:**
```
<:S:123> <:K:456> <:Y:789> + <:L:111> <:I:222> <:M:333> <:B:444> <:U:555> <:S:666>
```
**Expected:** `event_type = "Other"` (SKY + LIMBUS detected)

### Test Case 3: No Zone Detection
**Discord Description:**
```
This is a regular event with no zone emojis
```
**Expected:** `event_type = "Other"`

### Test Case 4: DYNAMIS Detection
**Discord Description:**
```
<:D:1> <:Y:2> <:N:3> <:A:4> <:M:5> <:I:6> <:S:7>
```
**Expected:** `event_type = "DYNAMIS"`

## Monitoring

### Check Event Types in Database
```sql
SELECT event_name, event_type, event_date
FROM events
WHERE is_from_discord = true
ORDER BY event_date DESC
LIMIT 20;
```

### Check Zone-Boss Mapping
```sql
SELECT z.zone_category, COUNT(m.dropid) as boss_count
FROM zones z
LEFT JOIN mobs m ON z.id = m.zone_id
WHERE z.zone_category IN ('SKY', 'LIMBUS', 'DYNAMIS', 'SEA', 'HENM')
GROUP BY z.zone_category
ORDER BY z.zone_category;
```

Expected output:
```
zone_category | boss_count
--------------+-----------
DYNAMIS       |         0
LIMBUS        |         0
SEA           |         0
SKY           |        13
```

## Future Enhancements

### 1. Add HENM Zone Data
Currently HENM is recognized but no zones exist in the database.

**Solution:** Add HENM zone categories to the zones table:
```sql
UPDATE zones
SET zone_category = 'HENM'
WHERE zone_name IN ('Behemoths_Dominion', 'Valley_of_Sorrows', 'Qufim_Island', ...);
```

### 2. Support Text-Based Zone Detection
Allow event organizers to use plain text instead of emojis:

```
Zone: SKY

2x All Gods for Sales
```

**Parser Update:**
```javascript
// Check for text patterns
if (description.match(/Zone:\s*(SKY|LIMBUS|SEA|HENM|DYNAMIS)/i)) {
    return match[1].toUpperCase();
}
```

### 3. Support Zone Aliases
Allow variations like "DYNAMIS" = "DYNA", "LIMBUS" = "LIMB":

```javascript
const zoneAliases = {
    'DYNA': 'DYNAMIS',
    'LIMB': 'LIMBUS'
};

if (zoneAliases[cleanText]) {
    return zoneAliases[cleanText];
}
```

## Related Files

- `n8n-parse-raid-helper-WITH-ZONE.js` - n8n parser with zone extraction
- `server.js:3807-3908` - Webhook handler storing event_type
- `server.js:1489-1533` - Boss filtering endpoint
- `DISCORD_SIGNUP_AUTO_USER_CREATION.md` - Related webhook documentation

---

**Created:** 2025-10-27
**Status:** Active
**Related Systems:** Discord, n8n, Raid-Helper, PostgreSQL, Railway
