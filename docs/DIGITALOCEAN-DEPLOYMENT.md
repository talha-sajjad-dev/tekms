# Deploy TEKMS to DigitalOcean - Step by Step Guide

## 🚀 Deployment Options

You have 2 options to deploy on DigitalOcean:
1. **App Platform** (Recommended) - Easiest, auto-scaling, managed
2. **Droplet** (Advanced) - More control, requires server management

We'll use **App Platform** for simplicity.

---

## 📋 Prerequisites Checklist

Before deploying, ensure you have:
- [x] DigitalOcean account
- [x] GitHub repository (https://github.com/gokhansancar82/tekms)
- [x] Database credentials (already configured)
- [x] Google OAuth credentials (already configured)
- [ ] Domain name (tekms.com) - optional but recommended

---

## Step 1: Create App on DigitalOcean App Platform

### 1.1 Login to DigitalOcean
1. Go to https://cloud.digitalocean.com/
2. Login to your account

### 1.2 Create New App
1. Click "Create" → "Apps" (or go to App Platform)
2. Click "Create App"

### 1.3 Connect GitHub Repository
1. Select "GitHub" as source
2. Authorize DigitalOcean to access your GitHub
3. Select repository: `gokhansancar82/tekms`
4. Select branch: `main` (or `gokhan` for testing)
5. Click "Next"

### 1.4 Configure App Settings
**App Name:** tekms  
**Region:** Choose closest to your users (e.g., New York)  
**Branch:** main  
**Auto-deploy:** Enable (deploys on every push)

### 1.5 Configure Build Settings
DigitalOcean should auto-detect Next.js. Verify:
- **Build Command:** `npm run build`
- **Run Command:** `npm start`
- **Output Directory:** `.next`
- **Node Version:** 18.x or higher

### 1.6 Set Environment Variables
Click "Edit" next to Environment Variables and add ALL of these:

```env
# Database (same as local)
DATABASE_URL=postgresql://doadmin:AVNS_MyP5sJ4wH7XtXjR1ZnN@db-postgresql-nyc1-00757-do-user-18650434-0.d.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# NextAuth - IMPORTANT: Update this!
NEXTAUTH_URL=https://your-app-name.ondigitalocean.app
NEXTAUTH_SECRET=c4rTvBT8F2X2SvEtp9JBbSHgcjQZiJWrlFmxOURB5Z0=

# Google OAuth
GOOGLE_CLIENT_ID=416002458685-08e813pl73pt22gocfee7287u8ht2mpe.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Encryption
ENCRYPTION_KEY=e2b79fd5abdcc5c4ee143c6abb483461e07aca0f4a752a2b7892266605c442fc

# Stripe (use placeholders for now)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_STARTER_PRICE_ID=price_starter
STRIPE_PRO_PRICE_ID=price_pro
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise
```

**CRITICAL:** The `NEXTAUTH_URL` will be shown after deployment. You'll need to update it in Step 3.

### 1.7 Select Plan
- **Basic Plan:** $5/month (512MB RAM, 1GB disk) - Good to start
- **Professional Plan:** $12/month (1GB RAM, 5GB disk) - Recommended for production

Click "Launch App"

---

## Step 2: Wait for Deployment

DigitalOcean will now:
1. Clone your repository ✅
2. Install dependencies ✅
3. Build your Next.js app ✅
4. Deploy to servers ✅

This takes 5-10 minutes. You'll see progress in the dashboard.

---

## Step 3: Update Environment Variables

### 3.1 Get Your App URL
After deployment completes, you'll see:
```
https://tekms-xxxxx.ondigitalocean.app
```

Copy this URL.

### 3.2 Update NEXTAUTH_URL
1. In App Platform dashboard, go to "Settings"
2. Click "Environment Variables"
3. Find `NEXTAUTH_URL`
4. Update to your actual URL: `https://tekms-xxxxx.ondigitalocean.app`
5. Click "Save"
6. App will automatically redeploy

### 3.3 Update Google OAuth Redirect URIs
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Go to "APIs & Services" → "Credentials"
3. Click your OAuth client
4. Add to "Authorized redirect URIs":
   ```
   https://tekms-xxxxx.ondigitalocean.app/api/auth/callback/google
   ```
5. Add to "Authorized JavaScript origins":
   ```
   https://tekms-xxxxx.ondigitalocean.app
   ```
6. Click "Save"

---

## Step 4: Run Database Migration (Production)

### 4.1 Access Console
1. In DigitalOcean App Platform dashboard
2. Click "Console" tab
3. Click "Run command"

### 4.2 Run Migration
Execute:
```bash
npx prisma migrate deploy
```

This creates all tables in your production database.

---

## Step 5: Create Admin User (Production)

In the console, run:
```bash
npx tsx scripts/create-admin.ts
```

This creates your admin account in production database.

---

## Step 6: Test Your Deployed App

### 6.1 Visit Your App
Go to: `https://tekms-xxxxx.ondigitalocean.app`

### 6.2 Test Features
1. Click "Sign In"
2. Try both methods:
   - Email/Password
   - Google OAuth
3. Access dashboard
4. Test all features

---

## Step 7: Connect Custom Domain (Optional)

### 7.1 In DigitalOcean
1. Go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter: `tekms.com`
4. You'll get DNS records to add

### 7.2 In Your Domain Registrar
Add these DNS records:
```
Type: A
Name: @
Value: [DigitalOcean IP]

Type: CNAME
Name: www
Value: tekms-xxxxx.ondigitalocean.app
```

### 7.3 Update Environment Variables
After domain is connected:
1. Update `NEXTAUTH_URL` to `https://tekms.com`
2. Update Google OAuth redirect URIs to use `tekms.com`
3. Redeploy

---

## 🔧 Troubleshooting

### Build Fails
**Check:**
- All environment variables are set
- `package.json` has correct scripts
- Node version is 18.x+

**Solution:**
- Review build logs in App Platform
- Check for missing dependencies

### Database Connection Fails
**Check:**
- DATABASE_URL is correct
- Database is accessible from App Platform
- DigitalOcean database allows connections from your app

**Solution:**
- Verify connection string
- Check database firewall rules
- Test with console command: `npx prisma db pull`

### OAuth Not Working
**Check:**
- NEXTAUTH_URL matches deployment URL
- Google OAuth redirect URIs are updated
- Google OAuth credentials are correct

**Solution:**
- Double-check all URLs match exactly
- No trailing slashes
- HTTPS required in production

---

## 📊 Cost Estimate

**Monthly Costs:**
- App Platform Basic: $5/month
- PostgreSQL Database: Already have ✅
- Custom Domain: $0 (if you own tekms.com)
- SSL Certificate: FREE (auto-provisioned)

**Total:** ~$5/month

---

## 🎯 Post-Deployment Checklist

After successful deployment:

- [ ] App is accessible at URL
- [ ] Google OAuth works
- [ ] Email/Password login works
- [ ] Database connected
- [ ] Admin dashboard accessible at `/admin`
- [ ] All pages load correctly
- [ ] Set up Stripe production keys
- [ ] Set up Resend API key (optional)
- [ ] Connect custom domain (optional)
- [ ] Test complete user flow

---

## 🚀 Ready to Deploy?

1. **Go to DigitalOcean:** https://cloud.digitalocean.com/apps
2. **Click "Create App"**
3. **Follow steps above**

Your TEKMS platform will be live in 10-15 minutes!

Need help with any step? Check the App Platform logs or console output for errors.