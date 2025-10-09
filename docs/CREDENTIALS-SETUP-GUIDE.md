# Credentials Setup Guide

This guide will help you obtain all the necessary credentials for your SaaS platform.

## 1. Google OAuth Setup (Required for Login)

### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create a New Project (or select existing)
1. Click on the project dropdown at the top
2. Click "NEW PROJECT"
3. Enter project name: "Your SaaS Platform Name"
4. Click "CREATE"

### Step 3: Enable Google OAuth
1. In the left sidebar, go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type, click "CREATE"
3. Fill in the required fields:
   - App name: Your SaaS Platform Name
   - User support email: your email
   - Developer contact: your email
4. Click "SAVE AND CONTINUE"
5. Skip the Scopes section, click "SAVE AND CONTINUE"
6. Add test users (your email), click "SAVE AND CONTINUE"

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Select "Web application"
4. Add these settings:
   - **Name**: Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - `https://yourdomain.com` (add when deploying)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google` (add when deploying)
5. Click "CREATE"

### Step 5: Copy Your Credentials
You'll see a popup with:
- **Client ID**: Something like `123456789-abc123.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abc123xyz789`

**Add these to your `.env` file:**
```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## 2. Stripe Setup (Required for Payments)

### Step 1: Create Stripe Account
1. Go to https://stripe.com/
2. Click "Sign up" or "Start now"
3. Create your account
4. Complete the onboarding process

### Step 2: Get API Keys
1. In Stripe Dashboard, click "Developers" in the top menu
2. Click "API keys" in the left sidebar
3. You'll see:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend) - click "Reveal test key"

**Add these to your `.env` file:**
```env
STRIPE_SECRET_KEY="sk_test_your_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"
```

### Step 3: Create Products and Prices
1. In Stripe Dashboard, click "Products" in the left sidebar
2. Click "+ Add product" for each plan:

**Starter Plan:**
- Name: Starter Plan
- Description: 500 products per month
- Pricing: $29.00 USD / month (recurring)
- After creating, copy the **Price ID** (starts with `price_...`)

**Professional Plan:**
- Name: Professional Plan  
- Description: 5,000 products per month
- Pricing: $79.00 USD / month (recurring)
- Copy the **Price ID**

**Enterprise Plan:**
- Name: Enterprise Plan
- Description: Unlimited products per month
- Pricing: $199.00 USD / month (recurring)
- Copy the **Price ID**

**Add these to your `.env` file:**
```env
STRIPE_STARTER_PRICE_ID="price_abc123starter"
STRIPE_PRO_PRICE_ID="price_abc123pro"
STRIPE_ENTERPRISE_PRICE_ID="price_abc123enterprise"
```

### Step 4: Set Up Webhooks (for local testing)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret that appears (starts with `whsec_...`)

**Add to your `.env` file:**
```env
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

**For production deployment:**
1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "+ Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and update `.env`

---

## 3. Optional: Email Setup (Resend)

### Step 1: Create Resend Account
1. Go to https://resend.com/
2. Sign up for free account

### Step 2: Get API Key
1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Copy the API key

### Step 3: Verify Domain (for production)
1. Go to "Domains"
2. Click "Add Domain"
3. Follow DNS verification instructions

**Add to your `.env` file:**
```env
RESEND_API_KEY="re_your_api_key"
FROM_EMAIL="noreply@yourdomain.com"
```

---

## Quick Checklist

After following this guide, your `.env` file should have:

- [x] `DATABASE_URL` (already configured)
- [x] `NEXTAUTH_URL` (already configured)
- [x] `NEXTAUTH_SECRET` (already configured)
- [x] `ENCRYPTION_KEY` (already configured)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_STARTER_PRICE_ID`
- [ ] `STRIPE_PRO_PRICE_ID`
- [ ] `STRIPE_ENTERPRISE_PRICE_ID`
- [ ] `RESEND_API_KEY` (optional)
- [ ] `FROM_EMAIL` (optional)

---

## Testing Credentials

Once you've added all credentials:

1. Run database migration:
   ```bash
   npx prisma migrate dev --name initial_saas_schema
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:3000
4. Click "Sign In" and test Google OAuth
5. Navigate to dashboard and test features

---

## Troubleshooting

### Google OAuth Error: "redirect_uri_mismatch"
- Ensure `http://localhost:3000/api/auth/callback/google` is in "Authorized redirect URIs"
- Check that `NEXTAUTH_URL` in `.env` matches your domain

### Stripe Webhook Not Working
- For local testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- For production, ensure webhook endpoint is publicly accessible

### Database Connection Error
- Verify DATABASE_URL format is correct
- Check that your IP is whitelisted in DigitalOcean (if using IP restrictions)
- Ensure `sslmode=require` is in the connection string

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file to git (it's in `.gitignore`)
- Use test keys during development (`sk_test_`, `pk_test_`)
- Switch to live keys only in production
- Keep your `ENCRYPTION_KEY` secret and never change it after storing encrypted data
- Regularly rotate your `NEXTAUTH_SECRET` and API keys

---

## Next Steps

After setting up credentials:
1. Run database migrations
2. Test Google login
3. Test Stripe payment flow
4. Deploy to production
5. Update OAuth and Stripe URLs for production domain