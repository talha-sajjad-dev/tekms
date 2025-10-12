# TEKMS Listing Manager - Production Deployment Guide

This guide will walk you through deploying TEKMS Listing Manager to production.

## Prerequisites

- [ ] Domain name (e.g., tekms.com)
- [ ] DigitalOcean account (or preferred hosting provider)
- [ ] Stripe account
- [ ] Email service (Zoho Mail or similar SMTP)
- [ ] Developer accounts for platforms you want to support:
  - [ ] BigCommerce Developer Account
  - [ ] Shopify Partners Account
  - [ ] Etsy Developer Account
  - [ ] TikTok for Business Account

## 1. Database Setup (DigitalOcean PostgreSQL)

### Create Database
1. Go to DigitalOcean → Databases
2. Create a new PostgreSQL database cluster
3. Choose your region (closest to your users)
4. Select plan (minimum: Basic - $15/month)
5. Wait for database to provision
6. Copy the connection string

### Configure Database
```bash
# Set DATABASE_URL in your .env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Run migrations
npx prisma migrate deploy

# Seed pricing tiers
npx tsx prisma/seed-pricing-tiers.ts

# Seed footer pages
npx tsx prisma/seed-pages.ts
```

## 2. Environment Variables

Create a `.env.production` file with the following:

```env
# App
NODE_ENV=production
NEXTAUTH_URL=https://tekms.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Database
DATABASE_URL=<your-digitalocean-postgresql-url>

# Encryption (for API keys/secrets storage)
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Google OAuth (Optional - for admin/user login)
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# The following are managed via Admin Panel:
# - Stripe keys (stripe_secret_key, stripe_publishable_key, stripe_webhook_secret)
# - Email settings (email_provider, email_api_key, etc.)
# - OAuth platform credentials (shopify_client_id, etsy_client_id, etc.)
```

### Generate Secure Keys
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

## 3. Platform OAuth Setup

### 3.1 Shopify OAuth App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" → "Create App"
3. Choose "Public app"
4. Fill in:
   - App name: "TEKMS Listing Manager"
   - App URL: `https://tekms.com`
   - Allowed redirection URL(s): `https://tekms.com/api/auth/callback/shopify`
5. Under "API credentials":
   - Copy **Client ID**
   - Copy **Client Secret**
6. Set required scopes:
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`

**Admin Panel Configuration:**
- Navigate to: Admin → System Settings → OAuth → Shopify
- Enter Client ID
- Enter Client Secret
- Enter Redirect URI: `https://tekms.com/api/auth/callback/shopify`

### 3.2 Etsy OAuth App

1. Go to [Etsy Developers](https://www.etsy.com/developers/)
2. Create a new app
3. Fill in app details
4. Important: Etsy uses PKCE (no client secret needed)
5. Copy your **Keystring** (this is your API Key/Client ID)

**Admin Panel Configuration:**
- Navigate to: Admin → System Settings → OAuth → Etsy
- Enter Keystring (API Key)
- No client secret needed (Etsy uses PKCE)
- No redirect URI registration needed in Etsy portal

### 3.3 TikTok for Business

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Enable "TikTok Shop" permissions
4. Set redirect URI: `https://tekms.com/api/auth/callback/tiktok`
5. Copy:
   - **App ID** (Client ID)
   - **App Secret** (Client Secret)

**Admin Panel Configuration:**
- Navigate to: Admin → System Settings → OAuth → TikTok
- Enter Client ID
- Enter Client Secret
- Enter Redirect URI: `https://tekms.com/api/auth/callback/tiktok`

### 3.4 BigCommerce (API Credentials Only)

BigCommerce doesn't use OAuth flow like others. Users need to:
1. Get their **Store Hash** from BigCommerce admin URL
2. Generate **API Access Token** from BigCommerce → Advanced Settings → API Accounts

Users enter these directly in their store connection settings.

## 4. Stripe Setup

### Create Products and Prices
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. For each pricing tier, create:
   - A product (e.g., "Starter Tier")
   - Monthly recurring price
   - Yearly recurring price (optional)
3. Copy each price ID (starts with `price_`)

### Configure Webhook
1. Go to Stripe → Developers → Webhooks
2. Add endpoint: `https://tekms.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Webhook Signing Secret**

**Admin Panel Configuration:**
- Navigate to: Admin → System Settings → Stripe
- Enter Secret Key (sk_live_...)
- Enter Publishable Key (pk_live_...)
- Enter Webhook Secret (whsec_...)

**Update Pricing Tiers:**
- Navigate to: Admin → Pricing Tiers
- Edit each tier and add the Stripe Price IDs you created

## 5. Email Configuration (Zoho Mail)

### Zoho Mail SMTP Setup
1. Create a Zoho Mail account
2. Go to Zoho Mail → Settings → Mail Accounts → IMAP Access
3. Enable IMAP access
4. Generate App Password

**Admin Panel Configuration:**
- Navigate to: Admin → System Settings → Email
- Provider: `smtp` (or custom provider)
- SMTP Host: `smtp.zoho.com`
- SMTP Port: `465`
- SMTP User: your@domain.com
- SMTP Password: (app password)
- From Address: noreply@tekms.com
- From Name: TEKMS Listing Manager

## 6. Application Deployment

### Option A: Vercel (Recommended)

1. **Connect GitHub Repository**
   ```bash
   git remote add origin https://github.com/yourusername/tekms.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Connect GitHub and select your repository
   - Configure project:
     - Framework: Next.js
     - Root Directory: ./
     - Build Command: `npm run build`
     - Output Directory: .next

3. **Environment Variables**
   - Add all variables from `.env.production`
   - Deploy!

4. **Custom Domain**
   - Go to Project Settings → Domains
   - Add your domain (tekms.com)
   - Update DNS records as instructed

### Option B: DigitalOcean App Platform

1. **Create App**
   ```bash
   # Push to GitHub first
   git remote add origin https://github.com/yourusername/tekms.git
   git push -u origin main
   ```

2. **Configure App**
   - Go to DigitalOcean → Apps
   - Create App from GitHub
   - Select repository
   - Set build command: `npm run build`
   - Set run command: `npm start`

3. **Environment Variables**
   - Add all from `.env.production`
   - Click "Deploy"

4. **Custom Domain**
   - Add domain in App settings
   - Update DNS records

## 7. DNS Configuration

Point your domain to your hosting provider:

### Vercel
```
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

### DigitalOcean
```
A     @      <your-app-ip>
CNAME www    <your-app-name>.ondigitalocean.app
```

## 8. Post-Deployment Checklist

### Admin Configuration
- [ ] Log in with admin account
- [ ] Configure all System Settings (Stripe, Email, OAuth)
- [ ] Update pricing tiers with Stripe price IDs
- [ ] Create/edit footer pages (About, Contact, Privacy, etc.)
- [ ] Test email sending
- [ ] Test user registration

### OAuth Testing
- [ ] Test Shopify connection (create test store)
- [ ] Test Etsy connection
- [ ] Test TikTok connection
- [ ] Verify product sync works

### Billing Testing
- [ ] Create test user
- [ ] Connect test store
- [ ] Verify automatic tier assignment
- [ ] Test Stripe checkout flow
- [ ] Verify webhook processing
- [ ] Test subscription management

### Security
- [ ] Enable HTTPS (should be automatic)
- [ ] Test CORS settings
- [ ] Verify API rate limiting
- [ ] Check error logging
- [ ] Set up monitoring (Vercel Analytics or similar)

## 9. Creating First Admin User

```bash
# Connect to your production database
psql $DATABASE_URL

# Create admin user (replace with your email)
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'your-admin@email.com';
```

Or use Prisma Studio:
```bash
npx prisma studio --url $DATABASE_URL
```

## 10. Monitoring and Maintenance

### Regular Tasks
- Monitor Stripe dashboard for failed payments
- Check error logs in Vercel/DigitalOcean
- Review user activity and product sync jobs
- Update pricing tiers as needed
- Respond to support emails

### Database Backups
- DigitalOcean automatically backs up managed databases
- Consider additional automated backups for safety

### Updates
```bash
# Pull latest changes
git pull origin main

# Run new migrations
npx prisma migrate deploy

# Restart application (automatic on Vercel)
```

## 11. Troubleshooting

### OAuth Not Working
- Verify redirect URIs match exactly (no trailing slash)
- Check that credentials are entered in Admin Panel
- Ensure database is reading settings correctly
- Check browser console for errors

### Stripe Webhooks Failing
- Verify webhook secret in Admin Panel
- Check webhook endpoint is publicly accessible
- Review Stripe webhook logs for errors

### Email Not Sending
- Verify SMTP credentials in Admin Panel
- Check email provider allows app passwords
- Test with simple email first
- Review email logs in database

### Database Connection Issues
- Check DATABASE_URL format
- Verify database cluster is running
- Check connection limits
- Review database logs in DigitalOcean

## 12. Production URLs

After deployment, your app will be available at:
- **Main App**: https://tekms.com
- **Admin Panel**: https://tekms.com/admin
- **API Endpoints**: https://tekms.com/api/*

## Support

For issues:
1. Check this deployment guide
2. Review error logs
3. Check database for data consistency
4. Contact support@tekms.com

---

**Last Updated**: 2025-10-12
**Version**: 1.0.0