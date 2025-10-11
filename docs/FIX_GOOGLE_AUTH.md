# Fix Google Sign-In 404 Error

## Problem
Google sign-in returns 404 error on production (tekms.com)

## Root Cause
Environment variables not properly configured for production domain

## Solution

### Step 1: Update Server Environment Variables

SSH into your server:
```bash
ssh tekms@68.183.149.168
```

Edit the `.env` file:
```bash
cd /home/tekms/tekms-app
nano .env
```

Ensure these variables are set correctly:
```env
# CRITICAL: Must be the production URL
NEXTAUTH_URL="https://tekms.com"
NEXTAUTH_SECRET="your-nextauth-secret-32-chars-minimum"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Database
DATABASE_URL="your-postgres-connection-string"

# Encryption
ENCRYPTION_KEY="your-32-byte-encryption-key"

# Node environment
NODE_ENV="production"
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

### Step 2: Update Google Cloud Console

1. Go to https://console.cloud.google.com
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Edit it and add these URIs:

**Authorized JavaScript origins:**
```
https://tekms.com
```

**Authorized redirect URIs:**
```
https://tekms.com/api/auth/callback/google
```

6. Click **Save**

### Step 3: Restart the Application

Back on the server:
```bash
pm2 restart tekms
```

Or use the deployment script:
```bash
cd /home/tekms/tekms-app
./deploy.sh
```

### Step 4: Verify

1. Visit https://tekms.com
2. Click "Sign In"
3. Click "Continue with Google"
4. Should redirect to Google OAuth page (not 404)

## Checking Current Environment

Run this from the server:
```bash
cd /home/tekms/tekms-app
node check-env.js
```

This will show which environment variables are set/missing.

## Common Issues

### Issue: Still getting 404
**Solution:** Clear browser cache and cookies for tekms.com

### Issue: "Redirect URI mismatch"
**Solution:** Double-check Google Console redirect URI exactly matches:
`https://tekms.com/api/auth/callback/google`

### Issue: "Configuration error"
**Solution:** Verify NEXTAUTH_SECRET is set and is at least 32 characters

## Testing Locally First

Before testing on production, verify locally:
```bash
# In your local .env file
NEXTAUTH_URL="http://localhost:3000"

# In Google Console, add:
# Authorized JavaScript origins: http://localhost:3000
# Authorized redirect URIs: http://localhost:3000/api/auth/callback/google
```

Run locally:
```bash
npm run dev
```

Test Google sign-in at http://localhost:3000

## Need Help?

If still having issues:
1. Check PM2 logs: `pm2 logs tekms`
2. Check Next.js logs for auth errors
3. Verify .env file has no trailing spaces or quotes issues
4. Ensure database connection is working