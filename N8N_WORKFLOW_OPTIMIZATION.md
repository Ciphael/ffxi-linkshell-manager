# n8n Workflow Optimization Guide

## Overview
This guide shows how to update the n8n workflow to efficiently process Discord Raid-Helper events.

**Key Improvements**:
- ✅ Processes ALL events on initial sync (97 events in your server)
- ✅ Filters for upcoming events only (after first run)
- ✅ Properly iterates over multiple events
- ✅ Handles actual Discord payload structure
- ✅ Extracts Raid-Helper event IDs correctly
- ✅ Makes individual API calls per event

---

## Current Workflow Issues

### Problem 1: No Event Filtering
- Currently fetches ALL messages without checking event date
- Processes past events unnecessarily
- Wastes API calls and processing time

### Problem 2: No Iteration
- URL pattern `{{ $json.id }}` assumes single item
- Doesn't handle array of events properly
- May be trying to process all 97 events as one

### Problem 3: Wrong ID Usage
- Uses Discord message ID instead of Raid-Helper event ID
- API calls fail or return wrong data

---

## Updated Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Discord Trigger                                          │
│    └─> Receives webhook from Discord                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Code Node: Parse Events                                  │
│    └─> n8n-parse-discord-events.js                         │
│    └─> Filters ALL events (initial) or upcoming (later)    │
│    └─> Returns array of event objects                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Split In Batches (Optional)                              │
│    └─> Batch size: 10                                      │
│    └─> Prevents rate limiting                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Code Node: Extract Raid-Helper ID                        │
│    └─> n8n-fetch-raid-helper-details.js                    │
│    └─> Builds API URL                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. HTTP Request (IF raid_helper_id exists)                  │
│    └─> URL: {{ $json.raid_helper_api_url }}                │
│    └─> Fetches participant details                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. HTTP Request: Push to Backend                            │
│    └─> POST https://ffxi-linkshell-manager-production      │
│              .up.railway.app/api/discord/event              │
│    └─> Sends event + participants                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Setup

### Step 1: Update Discord Message Parser

1. Open your n8n workflow
2. Find the **Code node** after Discord trigger
3. Replace its code with: **n8n-parse-discord-events.js**

**What this does**:
- Verifies message is from Raid-Helper bot (`author.username === 'Raid-Helper'`)
- Extracts event data from embeds
- Parses Unix timestamps for event times
- Filters events (ALL initially, can switch to upcoming-only)
- Returns array of events for iteration

**Initial Setup (Process ALL events)**:
```javascript
// Line 51 in n8n-parse-discord-events.js
const shouldProcess = true; // ✅ Keep this uncommented
```

**After First Sync (Process upcoming only)**:
```javascript
// Line 51: Comment out
// const shouldProcess = true;

// Line 55: Uncomment this
const shouldProcess = eventTime && eventTime > currentTime; // ✅
```

---

### Step 2: Add Split In Batches (Optional but Recommended)

1. Add a **Split In Batches** node after the parser
2. Configure:
   - **Batch Size**: 10
   - **Options** → **Reset**: Checked

**Why?**
- Prevents overwhelming Raid-Helper API
- Avoids rate limiting
- Processes 10 events at a time

---

### Step 3: Extract Raid-Helper Event ID

1. Add a **Code node** after Split In Batches
2. Use code from: **n8n-fetch-raid-helper-details.js**

**What this does**:
- Extracts Raid-Helper event ID from:
  - Event URL (primary method)
  - Description links
  - Footer text
  - Embed fields
- Builds `raid_helper_api_url` for next node
- Skips events without valid ID

---

### Step 4: Fetch Participant Details from Raid-Helper

1. Add **HTTP Request** node
2. Configure:
   - **Method**: GET
   - **URL**: `{{ $json.raid_helper_api_url }}`
   - **Authentication**: None (if public API)
   - **Options** → **Ignore SSL Issues**: OFF

**Conditional Execution**:
- Click node → Settings → **Execute Only If**
- Expression: `{{ $json.raid_helper_id !== null && $json.raid_helper_id !== undefined }}`

---

### Step 5: Push to Backend API

1. Add **HTTP Request** node
2. Configure:
   - **Method**: POST
   - **URL**: `https://ffxi-linkshell-manager-production.up.railway.app/api/discord/event`
   - **Body Content Type**: JSON
   - **Body**:

```json
{
  "event": {
    "raid_helper_id": "{{ $json.raid_helper_id }}",
    "event_name": "{{ $json.event_name }}",
    "description": "{{ $json.description }}",
    "event_date": "{{ $json.event_time_readable }}",
    "channel_id": "{{ $json.channel_id }}",
    "message_id": "{{ $json.message_id }}",
    "is_from_discord": true
  },
  "signups": "{{ $('HTTP Request').item.json }}"
}
```

**Note**: Adjust node names as needed

---

## Testing the Workflow

### Test 1: Initial Sync (ALL events)

1. Ensure **n8n-parse-discord-events.js** has:
   ```javascript
   const shouldProcess = true; // Process ALL events
   ```

2. Trigger the workflow (manual test or wait for Discord event)

3. Check n8n execution log:
   - Should see: `Processed X Raid-Helper events`
   - Should see: `Past events: Y` and `Upcoming events: Z`

4. Verify backend database:
   ```sql
   SELECT event_name, event_date, is_from_discord, raid_helper_id
   FROM events
   WHERE is_from_discord = true
   ORDER BY event_date DESC;
   ```

5. Expected: All 97 events should be in database

---

### Test 2: Switch to Upcoming Events Only

1. After successful initial sync, update **n8n-parse-discord-events.js**:
   ```javascript
   // Comment out line 51
   // const shouldProcess = true;

   // Uncomment lines 54-55
   const shouldProcess = eventTime && eventTime > currentTime;
   ```

2. Re-run workflow

3. Check n8n execution log:
   - Should see: `Processed X Raid-Helper events` (where X < 97)
   - Should see: `Past events: 0` and `Upcoming events: X`

4. Verify no past events are processed

---

## Monitoring and Logs

### n8n Console Output

Each execution will log:
```
Processed 5 Raid-Helper events
Current time: 2025-10-23T12:00:00.000Z
- Upcoming events: 3
- Past events: 2
First event: Sky Event (2025-10-25T18:00:00.000Z)
```

### Backend Railway Logs

Check for successful event creation:
```bash
cd C:\users\roger\desktop\ffxi-linkshell-manager
railway logs
```

Look for:
- `POST /api/discord/event` requests
- Event creation confirmations
- Participant linking logs

---

## Troubleshooting

### Issue: No events being processed

**Check**:
1. Verify Discord trigger is receiving messages
2. Confirm messages are from Raid-Helper bot
3. Check if embeds exist in message payload
4. Look at n8n execution logs for errors

**Solution**: Add logging to parse script:
```javascript
console.log(`Total messages: ${$input.all().length}`);
console.log(`Raid-Helper messages: ${raidHelperCount}`);
```

---

### Issue: Can't extract Raid-Helper event ID

**Check**:
1. Look at actual embed structure in n8n execution data
2. Check if URL field exists
3. Verify event ID format

**Solution**: Update extraction logic in **n8n-fetch-raid-helper-details.js** based on actual data structure

---

### Issue: API rate limiting

**Symptoms**:
- HTTP 429 errors
- Raid-Helper API rejecting requests

**Solution**:
1. Reduce **Split In Batches** size to 5
2. Add **Wait** node between batches (5-10 seconds)
3. Add retry logic to HTTP Request node

---

## Performance Expectations

### Initial Sync (97 events, ALL mode)
- **Duration**: ~10-15 minutes (with batching)
- **API Calls**: ~97 to Raid-Helper + ~97 to backend
- **Rate**: ~10 events/minute

### Ongoing Sync (upcoming only)
- **Duration**: ~1-2 minutes
- **API Calls**: ~5-10 per run
- **Frequency**: On new Discord messages

---

## Switching Between Modes

### Mode 1: Process ALL Events (Initial Sync)

**Use when**:
- First time setting up
- Recovering from data loss
- Re-syncing historical events

**Code**:
```javascript
// n8n-parse-discord-events.js, line 51
const shouldProcess = true;
```

---

### Mode 2: Process UPCOMING Events Only (Normal Operation)

**Use when**:
- After initial sync complete
- Normal daily operation
- Only want future events

**Code**:
```javascript
// n8n-parse-discord-events.js, lines 54-55
const shouldProcess = eventTime && eventTime > currentTime;
```

---

## Advanced: Custom Filtering

Want events from last 30 days instead?

```javascript
// Process events from last 30 days to 6 months in future
const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60);
const sixMonthsFuture = currentTime + (180 * 24 * 60 * 60);

const shouldProcess = eventTime &&
                      eventTime > thirtyDaysAgo &&
                      eventTime < sixMonthsFuture;
```

---

## Files Reference

- **n8n-parse-discord-events.js** - Main event parser with filtering
- **n8n-fetch-raid-helper-details.js** - Raid-Helper ID extraction
- **N8N_WORKFLOW_OPTIMIZATION.md** - This guide

---

**Created**: 2025-10-23
**For**: FFXI Linkshell Manager Discord Integration
**Status**: Ready for implementation
