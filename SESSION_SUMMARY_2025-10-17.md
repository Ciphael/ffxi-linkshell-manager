# Session Summary - October 17, 2025

## What We Accomplished

### 🎯 Primary Goal: Raid-Helper Discord Integration

We began implementing Discord integration with Raid-Helper to automatically sync raid events from Discord to the FFXI Linkshell Manager website.

---

## Changes Made

### 1. Database Schema Changes ✅

**File Created**: `migrations/032_raid_helper_integration.sql`

**Changes to `events` table:**
- Added `raid_helper_id VARCHAR(255) UNIQUE` - Links Discord event to database event
- Added `discord_channel_id VARCHAR(255)` - Stores Discord channel ID
- Added `discord_message_id VARCHAR(255)` - Stores Discord message ID
- Added `is_from_discord BOOLEAN DEFAULT FALSE` - Flags Discord-created events

**Changes to `linkshell_members` table:**
- Added `discord_id VARCHAR(255) UNIQUE` - Discord user ID for member mapping
- Added `discord_username VARCHAR(255)` - Discord username#discriminator

**New Table Created: `event_signups`**
```sql
CREATE TABLE event_signups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES linkshell_members(id) ON DELETE CASCADE,
    discord_id VARCHAR(255),
    discord_username VARCHAR(255),
    role VARCHAR(100),  -- Tank, DD, Healer, Support, etc.
    status VARCHAR(50) DEFAULT 'accepted',
    signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, discord_id)
);
```

**Purpose**: Tracks who signed up for events from Discord, linking Discord users to linkshell members when possible.

---

### 2. Backend Webhook Endpoint ✅

**File Modified**: `server.js`

**New Endpoint**: `POST /api/webhooks/raid-helper`

**Location**: Lines 3349-3580 in server.js (just before app.listen())

**Functionality**:
- Receives webhook POST requests from Raid-Helper
- Processes events with actions: `created`, `updated`, `deleted`, `signup`, `unsignup`
- Creates/updates events in database
- Syncs participant signups
- Maps Discord users to linkshell members (when discord_id is linked)

**Helper Functions Added**:
1. `handleEventCreateOrUpdate(event_id, eventData)` - Creates or updates event in database
2. `handleEventDelete(event_id)` - Deletes event from database
3. `handleSignupChange(event_id, eventData)` - Re-syncs signups when someone joins/leaves

**Expected Webhook Payload Format**:
```json
{
  "event_id": "discord_event_id",
  "action": "created" | "updated" | "deleted" | "signup" | "unsignup",
  "event": {
    "title": "Event Title",
    "description": "Event Description",
    "start_time": "ISO 8601 timestamp",
    "end_time": "ISO 8601 timestamp",
    "channel_id": "discord_channel_id",
    "message_id": "discord_message_id",
    "leader": { "discord_id": "...", "username": "..." },
    "signups": [{ "discord_id": "...", "username": "...", "role": "..." }]
  }
}
```

---

### 3. Documentation Created ✅

**File Created**: `RAID_HELPER_INTEGRATION.md`

**Sections**:
1. **Overview** - Architecture diagram and flow
2. **Part 1: Discord Setup** - Commands to use in Discord
3. **Part 2: Database Schema** - Details on all schema changes
4. **Part 3: Webhook Payload Format** - Expected JSON structure
5. **Part 4: Testing the Integration** - Manual webhook tests with curl
6. **Part 5: Linking Discord Users** - How to link Discord IDs to members
7. **Part 6: Frontend Integration** - How to display Discord events
8. **Part 7: Additional Endpoints Needed** - GET /api/events/:eventId/signups
9. **Part 8: Deployment** - How to deploy changes
10. **Troubleshooting** - Common issues and fixes
11. **Security Considerations** - Signature verification and rate limiting

---

## Integration Architecture

```
┌─────────────────────────┐
│   Discord Server        │
│                         │
│   User creates event    │
│   with /create          │
└───────────┬─────────────┘
            │
            │ Raid-Helper webhook
            ▼
┌─────────────────────────┐
│   Backend (Railway)     │
│                         │
│   POST /api/webhooks/   │
│   raid-helper           │
│                         │
│   - Validates payload   │
│   - Creates event       │
│   - Syncs signups       │
└───────────┬─────────────┘
            │
            │ Saves to database
            ▼
┌─────────────────────────┐
│   PostgreSQL            │
│                         │
│   - events table        │
│   - event_signups table │
│   - linkshell_members   │
└───────────┬─────────────┘
            │
            │ Frontend fetches
            ▼
┌─────────────────────────┐
│   Frontend (Vercel)     │
│                         │
│   - Displays events     │
│   - Shows signups       │
│   - Discord badge       │
└─────────────────────────┘
```

---

## How It Works

### Event Creation Flow

1. **Discord**: Admin creates event using `/create` command
2. **Raid-Helper**: Posts event in Discord channel, sends webhook to backend
3. **Backend Webhook**: Receives payload, validates, creates event in database
4. **Database**: Stores event with `raid_helper_id` for linking
5. **Frontend**: Fetches events from `/api/events`, displays all events including Discord ones

### Signup Sync Flow

1. **Discord**: User clicks reaction/button to sign up for event
2. **Raid-Helper**: Sends `signup` webhook with updated participant list
3. **Backend**: Syncs signups to `event_signups` table
4. **Member Mapping**: If user has `discord_id` in `linkshell_members`, links automatically
5. **Frontend**: Displays signup list (pending endpoint creation)

---

## Remaining Work

### Backend Tasks

1. **Add GET /api/events/:eventId/signups endpoint** - Fetch signup list for display
2. **Add webhook signature verification** - Security enhancement
3. **Add rate limiting** - Prevent abuse
4. **Deploy to Railway** - Push changes and run migrations

### Discord Setup Tasks

1. **Configure Raid-Helper webhook in Discord**
   - Find webhook configuration (try `/webhook`, `/settings`, or `/api`)
   - Add webhook URL: `https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper`
   - Select all event types to trigger webhook

2. **Create test event in Discord**
   - Use `/create` command
   - Test with real Discord event to verify integration

3. **Link Discord IDs to linkshell members**
   - Manually update database: `UPDATE linkshell_members SET discord_id = '...' WHERE name = '...'`
   - Or create self-service profile page (future enhancement)

### Frontend Tasks

1. **Display Discord-originated events**
   - Add Discord badge/icon for events with `is_from_discord = true`
   - Add link to Discord message (using channel_id and message_id)
   - Show signup list from `event_signups` table

2. **Hide/Disable "Create Event" button (optional)**
   - If all events come from Discord, hide manual creation
   - Or keep for admin override/emergency events

---

## Testing Strategy

### Test 1: Manual Webhook Test

Use curl to test webhook endpoint before connecting Raid-Helper:

```bash
curl -X POST https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test_event_001",
    "action": "created",
    "event": {
      "title": "Test Sky Farm",
      "description": "Testing Discord integration",
      "start_time": "2025-10-20T20:00:00Z",
      "end_time": "2025-10-20T23:00:00Z",
      "channel_id": "test_channel",
      "message_id": "test_message",
      "leader": {
        "discord_id": "test_leader_123",
        "username": "TestLeader#0000"
      },
      "signups": [
        {
          "discord_id": "test_user_456",
          "username": "TestPlayer#1234",
          "role": "DD",
          "status": "accepted"
        }
      ]
    }
  }'
```

**Expected Response**: `{"success": true, "message": "Event created processed successfully"}`

### Test 2: Verify Database

```sql
-- Check event was created
SELECT * FROM events WHERE raid_helper_id = 'test_event_001';

-- Check signups were synced
SELECT * FROM event_signups
WHERE event_id = (SELECT id FROM events WHERE raid_helper_id = 'test_event_001');
```

### Test 3: Check Frontend

Visit website → Events tab → Should see "Test Sky Farm" event

### Test 4: Real Discord Event

Once webhook is configured in Discord:
1. Create event in Discord with `/create`
2. Check Railway logs for `[Raid-Helper Webhook] Received payload`
3. Verify event appears in database and frontend

---

## Key Design Decisions

### Why Webhook Instead of API Polling?

**Chosen Approach**: Webhook (push-based)

**Rationale**:
- Real-time updates (no delay)
- No need to poll Discord every X minutes
- Lower server load
- Raid-Helper designed for webhooks

**Alternative**: API polling (pull-based) would require:
- Cron job to fetch events every 5 minutes
- Raid-Helper API key
- More complex sync logic (detecting new/updated/deleted events)

### Why event_signups Table?

**Rationale**:
- Discord signups != linkshell members (not everyone may be in the database)
- Need to track Discord users who sign up even if not linked to members
- Allows gradual linking (users can link Discord ID later)
- Preserves signup history even if member is deleted

**Future Enhancement**:
- Auto-award points to linked members when event completes
- Show "Link your Discord" prompt to unlinked signups

### Default Event Type = "Sky"

**Rationale**:
- Most events in your system are Sky farming
- Can be manually changed in database if needed
- Future: Parse event title to auto-detect type (e.g., "Dynamis" in title → type = "Dynamis")

---

## Security Considerations

### Current State

- ✅ CORS configured for allowed origins
- ✅ Helmet middleware for security headers
- ⚠️ NO webhook signature verification (any POST request accepted)
- ⚠️ NO rate limiting on webhook endpoint

### Recommended Additions

1. **Webhook Signature Verification**
   - Raid-Helper may provide `X-Raid-Helper-Signature` header
   - Use HMAC-SHA256 to verify payload authenticity
   - Prevents spoofed webhook calls

2. **Rate Limiting**
   - Limit webhook endpoint to 100 requests/minute
   - Prevents abuse/DoS attacks

3. **IP Whitelisting** (if Raid-Helper provides static IPs)
   - Only accept requests from known Discord/Raid-Helper IPs

---

## Files Modified/Created

### Created:
1. `migrations/032_raid_helper_integration.sql` - Database schema changes
2. `RAID_HELPER_INTEGRATION.md` - Complete integration guide
3. `SESSION_SUMMARY_2025-10-17.md` - This document

### Modified:
1. `server.js` - Added webhook endpoint and handler functions (lines 3349-3580)

### Modified (Complete):
1. ✅ server.js - Added GET /api/events/:eventId/signups endpoint (line 1445-1471)
2. ✅ Created DISCORD_INTEGRATION_FRONTEND.md - Frontend implementation guide
3. ✅ Created test_raid_helper_webhook.json - Test payload
4. ✅ Created test_webhook.ps1 - PowerShell test script

---

## Next Session TODO

1. ✅ Complete: Database schema
2. ✅ Complete: Webhook endpoint
3. ✅ Complete: Documentation
4. ⬜ **TODO: Deploy to Railway and run migration**
5. ⬜ **TODO: Configure Raid-Helper webhook in Discord**
6. ⬜ **TODO: Test with real Discord event**
7. ⬜ **TODO: Add signups endpoint to backend**
8. ⬜ **TODO: Update frontend to show Discord events**
9. ⬜ **TODO: Link Discord IDs to linkshell members**
10. ⬜ **TODO: Add webhook signature verification**

---

## Commands for Next Session

### Deploy Backend Changes

```bash
cd C:\users\roger\desktop\ffxi-linkshell-manager
git add .
git commit -m "Add Raid-Helper Discord integration webhook"
git push
```

Railway will auto-deploy and run migration 032.

### Test Webhook Manually

```bash
curl -X POST https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper \
  -H "Content-Type: application/json" \
  -d @test_webhook_payload.json
```

### Check Railway Logs

```
# Look for:
[Raid-Helper Webhook] Received payload: ...
[Raid-Helper] Created event X (Discord ID: ...)
```

### Verify Migration Ran

Check Railway logs for:
```
Running migration: 032_raid_helper_integration.sql
```

---

## Questions to Research for Next Session

1. **How does Raid-Helper configure webhooks?**
   - What's the exact command? (`/webhook`, `/api`, `/settings`?)
   - Does it require API key?
   - What payload format does it actually send?

2. **Does Raid-Helper provide webhook signature?**
   - Check for `X-Signature`, `X-Raid-Helper-Signature`, or similar header
   - Get documentation on how to verify signature

3. **Can we get Raid-Helper's actual payload structure?**
   - Create test event in Discord
   - Check what Raid-Helper actually sends
   - Adjust backend code if needed

---

## Related Documentation

- **Main Integration Guide**: `RAID_HELPER_INTEGRATION.md`
- **Migration File**: `migrations/032_raid_helper_integration.sql`
- **Backend Code**: `server.js` lines 3349-3580
- **Raid-Helper Docs**: https://raid-helper.dev/documentation

---

**Last Updated**: 2025-10-17
**Session Duration**: ~2 hours
**Status**: Backend complete, pending Discord configuration and deployment
