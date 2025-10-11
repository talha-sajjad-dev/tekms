# TEKMS Listing Manager - Production Deployment Guide

## 🚨 PRE-DEPLOYMENT CHECKLIST

Before deploying, ensure you have:

- [ ] Pushed all changes to GitHub (gokhan branch) ✅ DONE
- [ ] Database is running (DigitalOcean PostgreSQL) ✅ ALREADY CONFIGURED
- [ ] Production domain is set up (tekms.com) ✅ ALREADY CONFIGURED
- [ ] SSL certificate is configured ✅ ALREADY CONFIGURED
- [ ] PM2 is installed and configured ✅ ALREADY CONFIGURED

## 📋 DEPLOYMENT STEPS

### Step 1: SSH into Production Server

```bash
ssh tekms@your-server-ip
# Or if you have SSH alias configured:
ssh tekms-server
```

### Step 2: Navigate to Application Directory

```bash
cd /home/tekms/tekms-app
```

### Step 3: Update Production Environment Variables

Before pulling changes, update your production `.env` file:

```bash
nano /home/tekms/tekms-app/.env
```

**CRITICAL: Update these values for production:**

```env
# ============================================
# NEXTAUTH (PRODUCTION VALUES)
# ============================================
NEXTAUTH_URL="https://tekms.com"
NODE_ENV="production"

# ============================================
# APP CONFIGURATION (PRODUCTION)
# ============================================
APP_URL="https://tekms.com"

# ============================================
# ENSURE THESE ARE SET (32+ characters)
# ============================================
NEXTAUTH_SECRET="your-secure-random-string-32-chars-minimum-change-this"
ENCRYPTION_KEY="your-encryption-key-32-bytes-minimum-change-this"
```

**Keep these as-is (already configured):**
- `DATABASE_URL` - DigitalOcean PostgreSQL connection
- `GOOGLE_CLIENT_ID` - Your Google OAuth credentials
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth credentials
- `INITIAL_ADMIN_EMAIL` - gokhansancar@gmail.com
- `INITIAL_ADMIN_PASSWORD` - Your admin password

Save and exit (Ctrl+X, then Y, then Enter)

### Step 4: Run the Deployment Script

```bash
# Make sure script is executable
chmod +x /home/tekms/tekms-app/deploy.sh

# Run deployment
./deploy.sh
```

**The script will automatically:**
1. Pull latest changes from GitHub (gokhan branch)
2. Install dependencies
3. Generate Prisma client
4. Run database migrations (including new Settings table)
5. Build the Next.js application
6. Restart PM2

### Step 5: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View recent logs
pm2 logs tekms --lines 50

# Check if app is responding
curl https://tekms.com/api/health
```

### Step 6: Update PM2 Environment (if needed)

If you see environment variable issues in logs:

```bash
pm2 restart tekms --update-env
pm2 save
```

## 🔍 POST-DEPLOYMENT VERIFICATION

### 1. Check Homepage
Visit: https://tekms.com
- Should see the new blue-cyan gradient homepage
- Navigation should work
- "Sign In" and "Get Started Free" buttons should appear

### 2. Test Authentication
- Click "Sign In"
- Try Google OAuth login
- Try email/password registration
- Verify redirect after login

### 3. Test User Dashboard
Login and check:
- `/dashboard` - Should show new modern dashboard
- `/stores` - Should show store connection page
- `/billing` - Should show billing dashboard

### 4. Test Admin Panel (Login as admin)
- `/admin` - Should show admin dashboard with 6 cards
- `/admin/settings` - Should show System Settings with 5 tabs

### 5. Check Database Migrations
```bash
# On server
cd /home/tekms/tekms-app
npx prisma studio
```
Verify these tables exist:
- `User`
- `Account`
- `Session`
- `Store`
- `StoreSubscription`
- `StorePricingTier`
- `Settings` ← NEW TABLE

## 🐛 TROUBLESHOOTING

### Issue: "UntrustedHost" Error

**Solution:** Ensure `.env` has:
```env
NEXTAUTH_URL="https://tekms.com"
NODE_ENV="production"
```
Then restart PM2:
```bash
pm2 restart tekms --update-env
pm2 save
```

### Issue: Google OAuth Not Working

**Solution:** Update Google OAuth settings:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   - `https://tekms.com/api/auth/callback/google`
4. Save changes

### Issue: Database Connection Failed

**Solution:** Check database credentials:
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

If fails, verify DATABASE_URL in `.env` matches DigitalOcean credentials.

### Issue: Build Errors

**Solution:**
```bash
cd /home/tekms/tekms-app
rm -rf .next
rm -rf node_modules
npm install --legacy-peer-deps
npm run build
pm2 restart tekms
```

### Issue: Migration Errors

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Force reset (CAUTION: Only if safe)
npx prisma migrate reset

# Or deploy specific migration
npx prisma migrate deploy
```

## 📊 MONITORING

### View Real-Time Logs
```bash
pm2 logs tekms
```

### View Error Logs Only
```bash
pm2 logs tekms --err
```

### View Application Metrics
```bash
pm2 monit
```

### Check Memory/CPU Usage
```bash
pm2 list
```

## 🔐 SECURITY CHECKLIST AFTER DEPLOYMENT

- [ ] NEXTAUTH_SECRET is strong random string (32+ chars)
- [ ] ENCRYPTION_KEY is strong random string (32+ chars)
- [ ] Database credentials are secure
- [ ] Google OAuth redirect URI is updated to https://tekms.com
- [ ] Admin password is changed from default
- [ ] Firewall is configured (only ports 80, 443, 22 open)
- [ ] SSL certificate is valid and auto-renewing

## 🎯 NEXT STEPS AFTER DEPLOYMENT

### 1. Configure OAuth Apps (CRITICAL)
As admin, visit: https://tekms.com/admin/settings

**Configure OAuth for each platform:**

#### Shopify
- Register app at: https://partners.shopify.com/
- Add OAuth credentials in Admin > Settings > OAuth tab
- Redirect URI: `https://tekms.com/api/auth/callback/shopify`

#### Etsy
- Register app at: https://www.etsy.com/developers/
- Add OAuth credentials in Admin > Settings > OAuth tab
- Redirect URI: `https://tekms.com/api/auth/callback/etsy`

#### BigCommerce
- Register app at: https://developer.bigcommerce.com/
- Add OAuth credentials in Admin > Settings > OAuth tab
- Redirect URI: `https://tekms.com/api/auth/callback/bigcommerce`

#### TikTok
- Register app at: https://seller-us.tiktok.com/open
- Add OAuth credentials in Admin > Settings > OAuth tab
- Redirect URI: `https://tekms.com/api/auth/callback/tiktok`

### 2. Configure Stripe (For Billing)
Visit: https://tekms.com/admin/settings > Stripe tab

Get credentials from: https://dashboard.stripe.com/apikeys
- Add Secret Key
- Add Publishable Key
- Configure Webhook (https://tekms.com/api/webhooks/stripe)
- Add Webhook Secret

### 3. Test Store Connections
1. Login as a test user
2. Go to: https://tekms.com/stores
3. Click "Connect Store"
4. Test OAuth flow for each platform

### 4. Verify Billing
1. Connect a store
2. Check subscription created in `/billing`
3. Verify Stripe dashboard shows subscription
4. Test upgrade/downgrade flows

## 📱 DEPLOYMENT COMMAND SUMMARY

Quick reference for future deployments:

```bash
# 1. SSH to server
ssh tekms@your-server

# 2. Navigate to app
cd /home/tekms/tekms-app

# 3. Deploy
./deploy.sh

# 4. Verify
pm2 logs tekms --lines 50
curl https://tekms.com/api/health

# 5. Update environment if needed
pm2 restart tekms --update-env
pm2 save
```

## 🆘 EMERGENCY ROLLBACK

If deployment breaks production:

```bash
# 1. Check last working commit
git log --oneline -10

# 2. Rollback to previous commit
git checkout <previous-commit-hash>

# 3. Rebuild and restart
npm run build
pm2 restart tekms

# 4. Or rollback migrations if needed
npx prisma migrate resolve --rolled-back <migration-name>
```

## ✅ SUCCESS INDICATORS

Deployment is successful when:
- ✅ `pm2 status` shows tekms as "online"
- ✅ https://tekms.com loads without errors
- ✅ Homepage shows new blue-cyan design
- ✅ Login/register works
- ✅ Dashboard shows new features
- ✅ Admin panel is accessible
- ✅ No errors in `pm2 logs tekms`

---

**Need Help?**
- Check logs: `pm2 logs tekms`
- View this guide: `cat /home/tekms/tekms-app/docs/DEPLOYMENT_GUIDE.md`
- Database issues: Check `docs/SETUP.md`