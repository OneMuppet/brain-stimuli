# Setup Guide: Google OAuth & Cloud Sync

## Overview
This guide will walk you through setting up Google OAuth credentials to enable cloud sync functionality.

## Prerequisites
- A Google account
- 10 minutes of setup time

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **"Select a project"** dropdown (top bar)
3. Click **"New Project"**
4. Enter project name: `brain-stimuli` (or your choice)
5. Click **"Create"**
6. Wait for project creation (takes ~30 seconds)

---

## Step 2: Enable Required APIs

1. In the left sidebar, navigate to **"APIs & Services"** → **"Enabled APIs & services"**
2. Click **"+ ENABLE APIS AND SERVICES"** (top of page)

### Enable Google Drive API:
1. Search for **"Google Drive API"**
2. Click on it
3. Click **"Enable"**

### Enable Google People API (optional, for user profile):
1. Go back to API Library
2. Search for **"Google People API"**
3. Click on it
4. Click **"Enable"**

---

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
2. Choose **"External"** (unless you have a Google Workspace)
3. Click **"Create"**

### App Information:
- **App name**: `Brain Stimuli Console`
- **User support email**: Your email
- **Developer contact**: Your email

### Scopes (Step 2 of consent screen):
Click **"Add or Remove Scopes"**, then search and add:
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`
- `.../auth/drive.appdata`
- `.../auth/drive.file`

Click **"Update"** then **"Save and Continue"**

### Test Users (Step 3):
- Add your own email address as a test user
- Click **"Save and Continue"**

---

## Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**

### Application Type:
- Choose **"Web application"**
- Name: `Brain Stimuli Web Client`

### Authorized JavaScript origins:
Click **"+ Add URI"**, add:
```
http://localhost:3000
```

### Authorized redirect URIs:
Click **"+ Add URI"**, add:
```
http://localhost:3000/api/auth/callback/google
```

Click **"Create"**

---

## Step 5: Save Your Credentials

A popup will appear with:
- **Client ID**: `something.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-something`

**Copy both values** - you'll need them next!

---

## Step 6: Configure Environment Variables

1. In your project root, create `.env.local`:
   ```bash
   touch .env.local
   ```

2. Open `.env.local` and add:
   ```env
   GOOGLE_CLIENT_ID="paste-your-client-id-here"
   GOOGLE_CLIENT_SECRET="paste-your-client-secret-here"
   NEXTAUTH_SECRET="generate-this-in-next-step"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as the value for `NEXTAUTH_SECRET`

---

## Step 7: Test Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Click **"Sign in with Google"**

4. You should see Google's consent screen

5. Grant permissions

6. You'll be redirected back to the app, signed in!

7. Test sync:
   - Create a session and add notes
   - Check browser console - you should see:
     - `"Synced from cloud"` (on page load)
     - `"Synced to cloud"` (every 60 seconds)

---

## Step 8: Production Deployment (AWS Amplify)

### Update OAuth for Production:

1. Deploy your app to Amplify (you'll get a URL like `https://main.d123.amplifyapp.com`)

2. Go back to **Google Cloud Console** → **Credentials**

3. Click on your OAuth client

4. Under **"Authorized redirect URIs"**, click **"+ Add URI"**:
   ```
   https://your-amplify-domain.com/api/auth/callback/google
   ```

5. Under **"Authorized JavaScript origins"**, click **"+ Add URI"**:
   ```
   https://your-amplify-domain.com
   ```

6. Click **"Save"**

### Configure Amplify Environment Variables:

1. In Amplify Console → Your App → **"Environment variables"**
2. Add:
   - `GOOGLE_CLIENT_ID`: (same as local)
   - `GOOGLE_CLIENT_SECRET`: (same as local)
   - `NEXTAUTH_SECRET`: (same as local)
   - `NEXTAUTH_URL`: `https://your-amplify-domain.com`

3. Redeploy (or push to trigger auto-deploy)

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Check that redirect URI matches exactly (including `/api/auth/callback/google`)
- Ensure you added your email as a test user in OAuth consent screen

### "No access token" error in console
- Verify Google Drive API is enabled
- Check that scopes include `drive.appdata`
- Make sure `NEXTAUTH_SECRET` is set

### "Sync failed" in console
- Open DevTools → Network tab
- Check `/api/sync` requests
- Look for 401 (not authenticated) or 500 (server error)
- Verify you're signed in (check for NextAuth cookies)

### Still not working?
- Clear browser cookies and localStorage
- Try signing out and back in
- Check that `.env.local` is not in `.gitignore` (it should be!)
- Restart dev server after changing `.env.local`

---

## Security Notes

✅ **What's secure:**
- Client Secret is stored server-side only (never in browser)
- Tokens are in HTTP-only cookies (not accessible to JavaScript)
- All Google Drive operations happen server-side
- Data is stored in `appDataFolder` (isolated per app, per user)

❌ **Common mistakes to avoid:**
- Don't commit `.env.local` to Git
- Don't share your Client Secret publicly
- Don't use the same credentials across multiple projects

---

## Next Steps

Once OAuth is working:
1. Create some sessions and notes
2. Sign in on another device → your data syncs automatically!
3. Try going offline → IndexedDB keeps everything working
4. Come back online → changes sync to cloud

Enjoy your cloud-synced Brain Stimuli Console! 🚀

