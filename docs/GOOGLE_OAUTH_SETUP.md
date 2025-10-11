# Google OAuth Setup Guide

## Step 1: Go to Google Cloud Console

Visit: https://console.cloud.google.com/

## Step 2: Create or Select a Project

1. Click on the project dropdown at the top
2. Click "NEW PROJECT"
3. Name it: **TEKMS Listing Manager**
4. Click "CREATE"

## Step 3: Enable Google+ API

1. Go to: https://console.cloud.google.com/apis/library
2. Search for "Google+ API"
3. Click on it
4. Click "ENABLE"

## Step 4: Configure OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **External** user type
3. Click "CREATE"

Fill in the form:
- **App name**: TEKMS Listing Manager
- **User support email**: gokhansancar@gmail.com
- **App logo**: (optional - skip for now)
- **Application home page**: **LEAVE EMPTY** (Google doesn't accept localhost here)
- **Authorized domains**: **LEAVE EMPTY** (for development)
- **Developer contact**: gokhansancar@gmail.com

**Note**: The "Application home page" field does NOT accept localhost URLs. Just leave it blank for development - it's optional!

4. Click "SAVE AND CONTINUE"
5. **Scopes**: Click "ADD OR REMOVE SCOPES"
   - Select: `userinfo.email`
   - Select: `userinfo.profile`
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

6. **Test users**: Click "ADD USERS"
   - Add: gokhansancar@gmail.com
   - Click "ADD"
   - Click "SAVE AND CONTINUE"

7. Click "BACK TO DASHBOARD"

## Step 5: Create OAuth 2.0 Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "CREATE CREDENTIALS"
3. Select "OAuth client ID"
4. Application type: **Web application**
5. Name: **TEKMS Web Client**

6. **Authorized JavaScript origins**:
   - Add: `http://localhost:3000`

7. **Authorized redirect URIs**:
   - Add: `http://localhost:3000/api/auth/callback/google`

8. Click "CREATE"

## Step 6: Copy Your Credentials

You'll see a popup with:
- **Client ID**: Starts with something like `123456789-xxx.apps.googleusercontent.com`
- **Client Secret**: A random string

**Copy both of these!**

## Step 7: Add to .env File

Open your `.env` file and add:

```env
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

## Step 8: Restart Dev Server

Stop the server (Ctrl+C) and restart:
```bash
npm run dev
```

## Step 9: Test Google Login

Visit: http://localhost:3000/api/auth/signin

You should see the NextAuth signin page with a "Sign in with Google" button!

## Troubleshooting

### Error: "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in the consent screen
- Verify the redirect URI exactly matches: `http://localhost:3000/api/auth/callback/google`

### Error: "redirect_uri_mismatch"
- Check that `http://localhost:3000/api/auth/callback/google` is in the authorized redirect URIs
- Make sure there are no trailing slashes
- Exact match required!

### Can't find Google+ API
- It might be deprecated. You can skip enabling it - OAuth will still work

## For Production

When deploying to production, you'll need to:

1. Add your production domain to authorized origins:
   - `https://yourdomain.com`

2. Add production redirect URI:
   - `https://yourdomain.com/api/auth/callback/google`

3. Publish the OAuth consent screen (move from Testing to Production)

4. Update `.env` in production with the same credentials