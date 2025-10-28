# Discord Signup Auto-User Creation

## Overview

When users sign up for events via Discord (using Raid-Helper), the system automatically creates user accounts for them. This seamless integration ensures all Discord event participants have corresponding user records in the database.

## Process Flow

### 1. Discord Event Signup
- User signs up for a Raid-Helper event in Discord
- Raid-Helper records their signup with `discord_id` and `discord_username`

### 2. n8n Webhook Detection
- n8n workflow monitors Discord for new signups
- Webhook payload sent to: `POST /api/webhooks/raid-helper`
- Payload includes:
  ```json
  {
    "event_id": "raid_helper_event_id",
    "action": "created" | "updated" | "signup",
    "event": {
      "title": "Event Title",
      "start_time": "ISO 8601 timestamp",
      "signups": [
        {
          "discord_id": "123456789",
          "username": "DiscordUser",
          "role": "DPS",
          "status": "accepted"
        }
      ]
    }
  }
  ```

### 3. User Account Creation (server.js:3920-3947)

**Check if user exists:**
```sql
SELECT id FROM users WHERE discord_id = $1
```

**If user NOT found:**
- Auto-create new user account:
```sql
INSERT INTO users (discord_id, discord_username, character_name, role, is_active, created_at)
VALUES ($1, $2, $3, 'user', false, NOW())
```

**Field Values:**
- `discord_id` = User's Discord ID (unique identifier)
- `discord_username` = User's Discord username
- `character_name` = **Same as discord_username** (admin can fix later)
- `role` = `'user'` (default role)
- `is_active` = `false` (requires admin approval)
- `created_at` = Current timestamp

### 4. Event Signup Linking

After user is created (or found), link the event signup:
```sql
INSERT INTO event_signups (event_id, member_id, discord_id, discord_username, role, status)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (event_id, discord_id) DO UPDATE
SET member_id = EXCLUDED.member_id,
    discord_username = EXCLUDED.discord_username,
    role = EXCLUDED.role,
    status = EXCLUDED.status
```

## Database Schema

### users table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255) NOT NULL,
    character_name VARCHAR(255) NOT NULL,  -- Defaults to discord_username
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### event_signups table
```sql
CREATE TABLE event_signups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id),  -- Links to auto-created user
    discord_id VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    status VARCHAR(50) DEFAULT 'accepted',
    signed_up_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, discord_id)
);
```

## User States

### Newly Created User (Auto-created from Discord)
- ✅ Has `discord_id` and `discord_username`
- ✅ Has `character_name` = `discord_username` (placeholder)
- ❌ `is_active` = `false` (not yet approved)
- ❌ Cannot login to app yet

### After Admin Approval
- Admin sets `is_active` = `true`
- Admin can update `character_name` if Discord username doesn't match FFXI character
- User can now login via Discord OAuth
- User appears in event participant lists

### After User Logs In (Optional)
- User authenticates via Discord OAuth
- Gets JWT token for app access
- Can view events they've signed up for
- Can update their own character name

## Admin Tasks

### 1. Review New Discord Signups
```sql
SELECT id, discord_username, character_name, is_active, created_at
FROM users
WHERE is_active = false
ORDER BY created_at DESC;
```

### 2. Fix Character Names
Many Discord usernames won't match FFXI character names. Update them:
```sql
UPDATE users
SET character_name = 'ActualFFXIName'
WHERE discord_username = 'DiscordUser123';
```

### 3. Activate Users
After verifying they're legitimate linkshell members:
```sql
UPDATE users
SET is_active = true
WHERE id = $1;
```

### 4. Bulk Activation (Use with caution)
If you trust all Discord signups from your server:
```sql
UPDATE users
SET is_active = true
WHERE is_active = false
  AND discord_id IS NOT NULL;
```

## Benefits

### 🎯 Seamless Integration
- Users don't need to manually register on website
- Event signups from Discord automatically tracked
- No duplicate accounts

### 📊 Complete Attendance Tracking
- All Discord signups linked to user accounts
- Historical event participation preserved
- Points can be awarded retroactively

### 🔧 Admin Control
- Review all new signups before activation
- Fix incorrect character names
- Remove non-members if needed

### 🔒 Security
- Users start inactive (can't login)
- Admin approval required
- Discord OAuth ensures identity verification

## Troubleshooting

### Issue: Users not being created

**Check n8n workflow:**
```bash
# Verify webhook is being called
railway logs --tail 50 | grep "Raid-Helper Webhook"
```

**Check payload format:**
- Ensure `signups` array exists
- Verify `discord_id` and `username` are present
- Check for 500 errors in Railway logs

### Issue: Duplicate users

**Symptom:** Multiple users with same `discord_id`

**Cause:** Database constraint violation (shouldn't happen)

**Fix:**
```sql
-- Find duplicates
SELECT discord_id, COUNT(*)
FROM users
GROUP BY discord_id
HAVING COUNT(*) > 1;

-- Keep first, merge signups, delete duplicates
-- (Contact admin for manual resolution)
```

### Issue: Character names are wrong

**This is expected!** Discord usernames rarely match FFXI character names.

**Fix:** Admin updates character names manually:
```sql
UPDATE users
SET character_name = 'RealFFXIName'
WHERE discord_username = 'gamer123';
```

## Integration with OAuth

When a user who was auto-created from Discord signup later logs in:

1. **User clicks "Login with Discord"**
2. **Discord OAuth verifies identity**
3. **System finds existing user by `discord_id`**
4. **Generates JWT token**
5. **User sees "Pending Approval" screen** (if `is_active = false`)
6. **After admin activates:** User can access full app

## Related Files

- `server.js:3766-4008` - Webhook handler and user creation logic
- `N8N_WORKFLOW_OPTIMIZATION.md` - n8n workflow configuration
- `DISCORD_OAUTH_SETUP.md` - OAuth login process
- `migrations/` - Database schema migrations

## Example n8n Workflow

```
Discord Trigger
    ↓
Parse Raid-Helper Events (Code Node)
    ↓
Fetch Raid-Helper API Details
    ↓
HTTP Request → POST /api/webhooks/raid-helper
    {
        "event_id": "...",
        "action": "created",
        "event": {
            "signups": [...]
        }
    }
    ↓
Backend creates users + event_signups
    ↓
Success Response
```

## Monitoring

### Check Recent Auto-Created Users
```sql
SELECT
    id,
    discord_username,
    character_name,
    is_active,
    created_at,
    CASE
        WHEN character_name = discord_username THEN '⚠️ Needs name fix'
        ELSE '✓ Name set'
    END as status
FROM users
WHERE discord_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

### Check Signups Linked to Users
```sql
SELECT
    e.event_name,
    es.discord_username,
    u.character_name,
    u.is_active,
    es.status
FROM event_signups es
JOIN events e ON es.event_id = e.id
LEFT JOIN users u ON es.member_id = u.id
WHERE es.discord_id IS NOT NULL
ORDER BY es.signed_up_at DESC
LIMIT 50;
```

## Future Enhancements

### Possible Improvements
1. **Character Name Mapping** - Admin-defined mapping table: Discord username → FFXI character
2. **Auto-Activation** - Trust all users from specific Discord roles
3. **Bulk Name Update** - Import CSV of Discord usernames + FFXI characters
4. **User Notification** - Discord DM when account is activated
5. **Self-Service Name Update** - Let users update their own character name on first login

---

**Created:** 2025-10-27
**Status:** Active
**Related Systems:** Discord, n8n, Raid-Helper, OAuth
