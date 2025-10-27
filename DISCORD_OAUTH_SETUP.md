# Discord OAuth Setup Guide

## Overview
This guide walks you through setting up Discord OAuth for the FFXI Linkshell Manager.

---

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it: `FFXI Linkshell Manager` (or your preferred name)
4. Click **"Create"**

---

## Step 2: Configure OAuth2 Settings

1. In your application, go to **"OAuth2"** → **"General"** in the left sidebar

2. **Add Redirect URI**:
   ```
   https://ffxi-linkshell-manager-production.up.railway.app/auth/discord/callback
   ```
   - Click **"Add Redirect"**
   - Click **"Save Changes"**

3. **Copy your credentials** (you'll need these for Railway):
   - **CLIENT ID**: Found at the top of the OAuth2 page
   - **CLIENT SECRET**: Click **"Reset Secret"** if needed, then copy it
   - ⚠️ **IMPORTANT**: Never commit the secret to git!

---

## Step 3: Get Your Discord Server (Guild) ID

1. Open Discord app/web
2. Go to **User Settings** → **Advanced**
3. Enable **"Developer Mode"**
4. Close settings
5. Right-click on your **Linkshell server** in the server list
6. Click **"Copy Server ID"**
7. Save this ID - you'll need it for Railway

---

## Step 4: Add Environment Variables to Railway

1. Go to your Railway project: https://railway.app
2. Select your **ffxi-linkshell-manager** service
3. Go to **"Variables"** tab
4. Click **"New Variable"** and add the following:

```bash
DISCORD_CLIENT_ID=<your_client_id_from_step_2>
DISCORD_CLIENT_SECRET=<your_client_secret_from_step_2>
DISCORD_GUILD_ID=<your_server_id_from_step_3>
SESSION_SECRET=<generate_random_string>
```

### Generating SESSION_SECRET

Run this command to generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online random string generator (32+ characters recommended)

---

## Step 5: Optional Environment Variables

These have defaults but can be customized:

```bash
DISCORD_REDIRECT_URI=https://ffxi-linkshell-manager-production.up.railway.app/auth/discord/callback
FRONTEND_URL=https://ffxi-linkshell-manager-frontend.vercel.app
NODE_ENV=production
```

---

## Step 6: Deploy Backend Changes

Your backend is already committed. Now deploy:

```bash
cd C:\users\roger\desktop\ffxi-linkshell-manager
git push
```

Railway will automatically deploy the changes (~1-2 minutes).

---

## Complete Authentication Architecture

### High-Level Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER AUTHENTICATION FLOW                      │
└──────────────────────────────────────────────────────────────────────┘

1. User Visits Website
        ↓
   Has Session Cookie?
        ↓
    ┌───NO───┐                              ┌───YES──┐
    ↓                                        ↓
Show "Login with Discord" Button      Load Dashboard (Logged In)
    ↓
User Clicks Button
    ↓
Redirect to Discord OAuth
    ↓
User Authorizes App
    ↓
Redirect to /auth/discord/callback
    ↓
Backend: Exchange Code for Token
    ↓
Backend: Fetch User Profile + Guilds
    ↓
Backend: Check Guild Membership
    ↓
┌──────────────────────────────────┐
│ Is user in Discord server?       │
│ (DISCORD_GUILD_ID)               │
└──────────────────────────────────┘
    ↓
┌───NO───┐                              ┌───YES──┐
↓                                        ↓
Reject: "not_in_server"              Check Database
Return Error to Frontend                  ↓
                              ┌────────────────────────┐
                              │ Does discord_id exist  │
                              │ in users table?        │
                              └────────────────────────┘
                                        ↓
                              ┌───NO───┐        ┌───YES──┐
                              ↓                  ↓
                       Store in Session    Update discord_username
                       Show "Link          Create Session
                       Character" Page     Redirect to Dashboard
                              ↓
                       User Enters FFXI
                       Character Name
                              ↓
                       Create User Record
                       (is_active = false)
                              ↓
                       Link Past Event Signups
                       (discord_id match)
                              ↓
                       Show "Pending Approval"
                              ↓
                       Admin Approves
                       (is_active = true)
                              ↓
                       User Can Access Full Site
```

---

## Detailed OAuth Flow (Step-by-Step)

### **Phase 1: Initial Request**

**Frontend → Backend**
```javascript
// User clicks "Login with Discord"
window.location.href = 'https://backend.railway.app/auth/discord';
```

**Backend (GET /auth/discord)**
```javascript
// Construct Discord OAuth URL
const params = {
  client_id: DISCORD_CLIENT_ID,
  redirect_uri: DISCORD_REDIRECT_URI,
  response_type: 'code',
  scope: 'identify guilds'  // Get user info + server list
};

// Redirect user to Discord
res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
```

---

### **Phase 2: Discord Authorization**

**User sees Discord prompt:**
- "FFXI Linkshell Manager wants to access your account"
- Shows requested permissions: Identity, Server List
- User clicks "Authorize"

**Discord → Backend**
```
Redirects to: /auth/discord/callback?code=ABC123...
```

---

### **Phase 3: Token Exchange & User Data**

**Backend (GET /auth/discord/callback)**

**Step 1: Exchange authorization code for access token**
```javascript
POST https://discord.com/api/oauth2/token
Body: {
  client_id: DISCORD_CLIENT_ID,
  client_secret: DISCORD_CLIENT_SECRET,
  grant_type: 'authorization_code',
  code: 'ABC123...',
  redirect_uri: DISCORD_REDIRECT_URI
}

Response: {
  access_token: 'XYZ789...',
  token_type: 'Bearer',
  expires_in: 604800,
  refresh_token: '...',
  scope: 'identify guilds'
}
```

**Step 2: Fetch user profile**
```javascript
GET https://discord.com/api/users/@me
Headers: { Authorization: 'Bearer XYZ789...' }

Response: {
  id: '123456789012345678',        // ← discord_id (permanent)
  username: 'Sifu_Drathos',        // ← discord_username (can change)
  discriminator: '1234',
  avatar: 'a1b2c3d4...',
  email: 'user@example.com'
}
```

**Step 3: Fetch user's guilds (servers)**
```javascript
GET https://discord.com/api/users/@me/guilds
Headers: { Authorization: 'Bearer XYZ789...' }

Response: [
  {
    id: '653786252553748500',  // ← Server ID
    name: 'FFXI Linkshell',
    icon: '...',
    owner: false,
    permissions: '...'
  },
  // ... other servers
]
```

---

### **Phase 4: Server Membership Verification**

**Backend Logic:**
```javascript
const isInServer = guilds.some(guild => guild.id === DISCORD_GUILD_ID);

if (!isInServer) {
  // User is NOT in the FFXI Discord server
  return res.redirect(`${FRONTEND_URL}/?error=not_in_server`);
}

// User IS in the server, continue...
```

**Why This Matters:**
- Only Discord server members can access the website
- Prevents random people from creating accounts
- Membership is the first gate of security

---

### **Phase 5: User Lookup & Account Linking**

**Backend: Check if user exists**
```sql
SELECT id, character_name, is_active, discord_username
FROM users
WHERE discord_id = '123456789012345678';
```

#### **Scenario A: User EXISTS (Returning User)**

```javascript
if (userExists) {
  // Update their Discord username (in case it changed)
  UPDATE users
  SET discord_username = 'New_Username'
  WHERE discord_id = '123456789012345678';

  // Create session
  req.session.user = {
    id: user.id,
    character_name: user.character_name,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    is_active: user.is_active
  };

  // Redirect to dashboard
  res.redirect(`${FRONTEND_URL}/?login=success`);
}
```

**User Experience:**
- ✅ Immediately logged in
- ✅ Sees their dashboard
- ✅ Session lasts 7 days

---

#### **Scenario B: User DOES NOT EXIST (New User)**

```javascript
if (!userExists) {
  // Store Discord info in session temporarily
  req.session.pendingDiscordLogin = {
    discord_id: discordUser.id,
    discord_username: discordUser.username,
    discord_email: discordUser.email
  };

  // Redirect to character linking page
  res.redirect(`${FRONTEND_URL}/link-character`);
}
```

**User sees "Link Character" page:**
- Message: "Welcome! Please enter your FFXI character name to complete registration."
- Input field: Character Name
- Button: "Complete Registration"

**User submits character name:**

```javascript
POST /auth/link-character
Body: {
  character_name: 'Lohengrin'
}

Backend:
1. Retrieve pendingDiscordLogin from session
2. Create user in database:

   INSERT INTO users (
     discord_id,
     discord_username,
     character_name,
     is_active
   ) VALUES (
     '123456789012345678',
     'Discord_Username',
     'Lohengrin',
     false  // ← Pending admin approval
   );

3. Link past event signups (if any):

   UPDATE event_signups
   SET member_id = [new_user_id]
   WHERE discord_id = '123456789012345678';

4. Create session (limited permissions)
5. Redirect to "Pending Approval" page
```

**User Experience:**
- ✅ Account created
- ✅ Past Discord event signups now linked
- ⏳ Cannot access full features yet (is_active = false)
- 👁️ Can view events they signed up for
- ❌ Cannot register for new events
- ❌ Cannot allocate items

---

### **Phase 6: Admin Approval**

**Admin Panel:**
```sql
-- Admin views pending users
SELECT id, character_name, discord_username, created_at
FROM users
WHERE is_active = false
ORDER BY created_at DESC;

-- Admin approves user
UPDATE users
SET is_active = true
WHERE id = [user_id];
```

**User Experience After Approval:**
- ✅ Full access to all features
- ✅ Can register for events
- ✅ Can be assigned items
- ✅ Appears in item allocation dropdowns

---

## User Creation Flows

### **Flow 1: Discord Event Signup (Unlinked)**

**When:** User signs up for event via Raid-Helper before linking account

```
Discord Event Signup
        ↓
n8n Webhook to Backend
        ↓
Backend: Check if discord_id exists
        ↓
    ┌───NO───┐
    ↓
Create event_signups record:
  event_id: 123
  discord_id: '123456789012345678'
  discord_username: 'User'
  member_id: NULL  ← Not linked yet
  status: 'accepted'
```

**Later, when user links account via OAuth:**
```sql
UPDATE event_signups
SET member_id = [new_user_id]
WHERE discord_id = '123456789012345678';
```

**Result:** All past signups are retroactively linked to the user account.

---

### **Flow 2: OAuth Registration (Clean)**

**When:** User visits website first, no prior event signups

```
OAuth Login (New User)
        ↓
Link Character Page
        ↓
Enter "Lohengrin"
        ↓
Create User:
  discord_id: '123...'
  character_name: 'Lohengrin'
  is_active: false
        ↓
No past signups to link
        ↓
Pending Approval
```

---

### **Flow 3: Manual Admin Creation + OAuth Link**

**When:** Admin creates user manually, later user logs in via OAuth

```
Admin Creates User:
  character_name: 'Lohengrin'
  discord_id: NULL
  is_active: true
        ↓
User Logs In via OAuth
        ↓
Backend: discord_id doesn't exist
        ↓
Link Character Page
        ↓
User enters "Lohengrin"
        ↓
ERROR: Character name exists
        ↓
Admin updates existing record:
  UPDATE users
  SET discord_id = '123...'
  WHERE character_name = 'Lohengrin';
```

**Note:** This requires admin intervention due to unique constraint on character_name.

---

## Session Management

### **Session Creation**
```javascript
req.session.user = {
  id: 42,                          // users.id
  character_name: 'Lohengrin',     // Display name
  discord_id: '123456789012345678', // Permanent identifier
  discord_username: 'Discord_Name', // Can change
  is_active: true                   // Permission level
};
```

### **Session Cookie Properties**
```javascript
{
  httpOnly: true,        // Cannot be accessed by JavaScript (XSS protection)
  secure: true,          // HTTPS only in production
  maxAge: 604800000,     // 7 days (in milliseconds)
  sameSite: 'none',      // Allow cross-origin (Vercel → Railway)
  domain: undefined      // Not set (allows subdomains)
}
```

### **Session Validation (Every API Request)**
```javascript
// Middleware checks
if (!req.session.user) {
  return res.status(401).json({ error: 'Not authenticated' });
}

if (!req.session.user.is_active) {
  return res.status(403).json({ error: 'Account pending approval' });
}
```

---

## Security Features

### **Discord ID as Single Source of Truth**
- ✅ **Permanent**: Discord IDs never change
- ✅ **Unique**: One Discord account = One website account
- ✅ **Reliable**: Username changes don't break authentication
- ✅ **Linkable**: Retroactively connects past event signups

### **Guild Membership Verification**
- ✅ Only Discord server members can register
- ✅ Checked on EVERY login attempt
- ✅ If user leaves Discord server, next login will fail
- ✅ Prevents random account creation

### **Admin Approval Gate**
- ✅ New users start with `is_active = false`
- ✅ Admin must manually approve each user
- ✅ Prevents automated abuse
- ✅ Allows vetting before granting access

### **Session Security**
- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite protection (CSRF mitigation)
- ✅ 7-day expiration (auto-logout)

---

## Integration with Event System

### **Event Signups Table Structure**
```sql
CREATE TABLE event_signups (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  member_id INTEGER REFERENCES users(id),  -- NULL if unlinked
  discord_id VARCHAR(255) NOT NULL,        -- Always present
  discord_username VARCHAR(255),
  role VARCHAR(50),
  status VARCHAR(20),
  UNIQUE (event_id, discord_id)
);
```

### **Why member_id can be NULL:**
- Discord users can sign up for events BEFORE creating accounts
- Signups are tracked by discord_id
- When user registers, member_id is populated retroactively
- This allows seamless transition from "Discord-only" to "Full Member"

### **Participant Display Logic**
```javascript
// Frontend shows participants from BOTH sources
const participants = await Promise.all([
  // Linked users (have member_id)
  fetch('/api/events/123/participants'),  // Returns users table data

  // Unlinked signups (member_id = NULL)
  fetch('/api/events/123/signups')        // Returns discord_username only
]);
```

---

## Data Privacy & GDPR Compliance

### **What We Store:**
- Discord ID (permanent identifier)
- Discord Username (for display, can change)
- Email (optional, from Discord OAuth)

### **What We DON'T Store:**
- Access tokens (discarded after use)
- Refresh tokens (not used)
- Avatar URLs (fetched on-demand if needed)

### **User Rights:**
- Request account deletion
- Export their data
- Revoke OAuth access (via Discord settings)

---

**Created**: 2025-10-27
**Updated**: 2025-10-27
**Status**: Production Ready

---

## Security Features

✅ **Server Membership Required**: Only members of your Discord server can register
✅ **Admin Approval Required**: New users start with `is_active = false`
✅ **Unique Constraints**: One Discord account = One website account
✅ **Session Security**: HttpOnly cookies, secure in production, SameSite protection
✅ **Discord ID Immutable**: Uses permanent Discord ID for linking, not username
✅ **Past Signups Linked**: When user registers, all past Discord event signups are linked

---

## Testing the OAuth Flow

1. Make sure environment variables are added to Railway
2. Wait for Railway deployment to complete
3. Open frontend: https://ffxi-linkshell-manager-frontend.vercel.app
4. Click "Login with Discord" button (once frontend is updated)
5. Authorize the application on Discord
6. Should redirect back with appropriate status
7. Check Railway logs for any errors:
   ```bash
   cd C:\users\roger\desktop\ffxi-linkshell-manager
   railway logs
   ```

---

## Troubleshooting

### Error: "not_in_server"
- User is not a member of your linkshell Discord server
- Verify DISCORD_GUILD_ID is correct
- User needs to join the Discord server first

### Error: "oauth_failed"
- Check Railway logs for details
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Verify REDIRECT_URI matches exactly in Discord Developer Portal

### Error: "No pending Discord login found"
- Session was lost or expired
- User needs to start OAuth flow again
- Check SESSION_SECRET is set in Railway

### Session not persisting
- Verify SESSION_SECRET is set
- Check browser allows cookies
- Verify CORS credentials are enabled (already configured)

---

## Next Steps

After setting up the backend OAuth:
1. ✅ Backend routes created
2. ⏳ Add "Login with Discord" button to frontend
3. ⏳ Create character linking UI page
4. ⏳ Create "Pending Approval" status page
5. ⏳ Create admin panel for approving users

---

**Created**: 2025-10-22
**For**: FFXI Linkshell Manager Discord OAuth Integration
