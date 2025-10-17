# Raid-Helper Discord Integration Guide

## Overview

This integration allows your FFXI Linkshell Manager to automatically sync events from Discord's Raid-Helper bot. Events created in Discord will automatically appear on your website with full participant lists.

## Architecture

```
Discord (Raid-Helper) → Webhook → Backend (Railway) → Database (PostgreSQL) → Frontend (Vercel)
```

When someone creates/updates an event in Discord:
1. Raid-Helper sends a webhook POST request to your backend
2. Backend processes the event data and stores it in PostgreSQL
3. Frontend automatically displays the event (pulled from database)
4. Participant signups are tracked and linked to linkshell members

---

## Part 1: Discord Setup

### Step 1: Configure Raid-Helper in Your Discord Server

In your Discord server, use these commands:

**Create a test event:**
```
/create
```
Fill out the event details:
- Title: "Sky Farm - Byakko"
- Date/Time: Tomorrow at 8 PM
- Duration: 3 hours
- Description: "Farming Byakko for drops"

**Check Raid-Helper's webhook/API settings:**
```
/settings
```
or
```
/webhook
```
or
```
/api
```

Look for options to configure an external webhook URL.

### Step 2: Get Your Webhook URL

Your backend webhook endpoint is:
```
https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper
```

### Step 3: Configure the Webhook in Raid-Helper

Depending on Raid-Helper's interface, you'll need to:

1. **Find webhook configuration**
   - Try `/webhook add` or `/api configure` in Discord
   - Or check the Raid-Helper web dashboard if available

2. **Add the webhook URL**
   - URL: `https://ffxi-linkshell-manager-production.up.railway.app/api/webhooks/raid-helper`
   - Event types: Select all (created, updated, deleted, signup changes)

3. **Save and test**
   - Create a test event in Discord
   - Check if it appears on your website

### Step 4: Explore Raid-Helper Features

```
/help                    # Show all commands
/create                  # Create an event
/list                    # List active events
/apikey show             # Get API key (if available)
/webhook list            # List configured webhooks
```

---

## Part 2: Database Schema (Already Created)

The migration `032_raid_helper_integration.sql` adds:

### New Columns in `events` table:
- `raid_helper_id` - Discord event ID (unique)
- `discord_channel_id` - Discord channel where event was posted
- `discord_message_id` - Discord message ID of the event post
- `is_from_discord` - Boolean flag to identify Discord-created events

### New Columns in `linkshell_members` table:
- `discord_id` - Discord user ID (unique)
- `discord_username` - Discord username#discriminator

### New Table `event_signups`:
```sql
CREATE TABLE event_signups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    member_id INTEGER REFERENCES linkshell_members(id),  -- NULL if not linked
    discord_id VARCHAR(255),
    discord_username VARCHAR(255),
    role VARCHAR(100),  -- Tank, DD, Healer, Support, etc.
    status VARCHAR(50) DEFAULT 'accepted',  -- accepted, tentative, declined
    signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Part 3: Webhook Payload Format

### Expected Payload Structure

Raid-Helper should send JSON payloads in this format:

```json
{
  "event_id": "1234567890123456789",
  "action": "created",
  "event": {
    "title": "Sky Farm - Byakko",
    "description": "Farming Byakko for Abjurations and crafting materials",
    "start_time": "2025-10-20T20:00:00Z",
    "end_time": "2025-10-20T23:00:00Z",
    "channel_id": "987654321098765432",
    "message_id": "111222333444555666",
    "leader": {
      "discord_id": "123456789012345678",
      "username": "RaidLeader#1234"
    },
    "signups": [
      {
        "discord_id": "111111111111111111",
        "username": "Player1#5678",
        "role": "Tank",
        "status": "accepted"
      },
      {
        "discord_id": "222222222222222222",
        "username": "Player2#9999",
        "role": "DD",
        "status": "accepted"
      }
    ]
  }
}
```

### Supported Actions:
- `created` - New event created
- `updated` - Event details changed
- `deleted` - Event cancelled/deleted
- `signup` - Someone signed up for event
- `unsignup` - Someone removed their signup

---

## Part 4: Testing the Integration

### Test 1: Manual Webhook Test

Use a tool like Postman or curl to test the webhook endpoint:

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

Expected response:
```json
{
  "success": true,
  "message": "Event created processed successfully"
}
```

### Test 2: Check Database

After sending the test webhook, verify the event was created:

```sql
SELECT * FROM events WHERE raid_helper_id = 'test_event_001';
SELECT * FROM event_signups WHERE event_id = (SELECT id FROM events WHERE raid_helper_id = 'test_event_001');
```

### Test 3: Check Frontend

Visit your website and navigate to the Events page. You should see the test event displayed.

---

## Part 5: Linking Discord Users to Linkshell Members

For full functionality, linkshell members need their Discord IDs linked:

### Option A: Manual Update (Admin)

```sql
UPDATE linkshell_members
SET discord_id = '123456789012345678',
    discord_username = 'PlayerName#1234'
WHERE name = 'PlayerName';
```

### Option B: Self-Service (Future Feature)

Add a profile page where members can link their Discord account:
1. User clicks "Link Discord Account"
2. Shows their Discord ID (they can find it in Discord settings)
3. User enters Discord ID
4. System validates and links account

### Option C: Automatic Sync (Advanced)

Use Discord OAuth2 to automatically link accounts when users log in.

---

## Part 6: Frontend Integration

### Display Discord Events

The frontend already fetches events from `/api/events`. Discord-created events will appear automatically with the `is_from_discord` flag set to `true`.

You can add special indicators:

```javascript
// In your frontend event display code
if (event.is_from_discord) {
    // Show Discord badge
    eventHTML += '<span class="discord-badge">📱 From Discord</span>';

    // Add link to Discord message
    if (event.discord_channel_id && event.discord_message_id) {
        const discordLink = `https://discord.com/channels/YOUR_SERVER_ID/${event.discord_channel_id}/${event.discord_message_id}`;
        eventHTML += `<a href="${discordLink}" target="_blank">View in Discord</a>`;
    }
}
```

### Show Participant List

Fetch signups for an event:

```javascript
const response = await fetch(`/api/events/${eventId}/signups`);
const signups = await response.json();

// Display signups
signups.forEach(signup => {
    console.log(`${signup.discord_username} - ${signup.role} (${signup.status})`);
});
```

You'll need to add this endpoint to your backend (see Part 7).

---

## Part 7: Additional Backend Endpoints Needed

### GET /api/events/:eventId/signups

Add this endpoint to fetch signups for display:

```javascript
app.get('/api/events/:eventId/signups', async (req, res) => {
    try {
        const { eventId } = req.params;

        const result = await pool.query(`
            SELECT
                es.*,
                lm.name as member_name,
                lm.character_name
            FROM event_signups es
            LEFT JOIN linkshell_members lm ON es.member_id = lm.id
            WHERE es.event_id = $1
            ORDER BY es.signed_up_at ASC
        `, [eventId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching signups:', error);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
});
```

---

## Part 8: Deployment

### Deploy Backend Changes

1. Commit your changes:
```bash
cd ffxi-linkshell-manager
git add server.js migrations/032_raid_helper_integration.sql
git commit -m "Add Raid-Helper Discord integration"
git push
```

2. Railway will automatically deploy
3. Migration will run on startup
4. Webhook endpoint will be available immediately

### Verify Deployment

Check Railway logs for:
```
[Raid-Helper Webhook] Received payload: ...
```

---

## Troubleshooting

### Webhook Not Receiving Data

1. **Check Raid-Helper configuration**
   - Verify webhook URL is correct
   - Ensure all event types are selected
   - Test webhook in Raid-Helper settings

2. **Check Railway logs**
   - Look for `[Raid-Helper Webhook]` messages
   - Check for errors in event processing

3. **Test webhook manually**
   - Use curl/Postman to send test payload
   - Verify endpoint returns 200 OK

### Events Not Appearing on Frontend

1. **Check database**
   ```sql
   SELECT * FROM events WHERE is_from_discord = true;
   ```

2. **Check frontend API calls**
   - Open browser DevTools → Network tab
   - Verify `/api/events` returns Discord events

3. **Clear frontend cache**
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache

### Signups Not Syncing

1. **Check event_signups table**
   ```sql
   SELECT * FROM event_signups WHERE event_id = X;
   ```

2. **Verify Discord users are in payload**
   - Check Railway logs for webhook payload
   - Ensure `signups` array is populated

3. **Link Discord IDs to members**
   - Signups work even without linked accounts
   - But linking enables better tracking

---

## Security Considerations

### Webhook Signature Verification (Future Enhancement)

Raid-Helper may provide a signature header to verify webhook authenticity. Add this check:

```javascript
function verifyRaidHelperSignature(req) {
    const signature = req.headers['x-raid-helper-signature'];
    const secret = process.env.RAID_HELPER_WEBHOOK_SECRET;

    if (!signature || !secret) return false;

    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    return signature === expectedSignature;
}
```

### Rate Limiting

Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
});

app.post('/api/webhooks/raid-helper', webhookLimiter, async (req, res) => {
    // ... existing code
});
```

---

## Next Steps

1. **Configure Raid-Helper webhook in Discord**
2. **Test with a real Discord event**
3. **Link Discord IDs to linkshell members**
4. **Update frontend to show Discord badges and signup lists**
5. **Add webhook signature verification for security**
6. **Set up rate limiting**

---

## Support & Documentation

- **Raid-Helper Docs**: https://raid-helper.dev/documentation
- **Discord Server**: (Your Discord server link)
- **Backend Logs**: Check Railway dashboard
- **Database**: Use provided SQL queries for debugging

---

Last Updated: 2025-10-17
