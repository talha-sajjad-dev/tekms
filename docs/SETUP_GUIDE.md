# BigCommerce "Get a Quote" App - Setup Guide

## 🚀 Complete Setup Instructions

This guide will walk you through setting up and deploying your BigCommerce Quote Request app.

---

## Part 1: Register Your App in BigCommerce DevTools

### Step 1: Create BigCommerce Developer Account

1. Go to: https://devtools.bigcommerce.com
2. Click "Create Account" or "Sign In"
3. Complete registration if needed

### Step 2: Create New App

1. Click "Create an App"
2. Fill in the app details:

```
App Name: Quote Request System
App Summary: Add "Get a Quote" functionality to replace Add to Cart
```

3. **IMPORTANT**: You'll need your app URL first. Options:
   - Deploy to Vercel first, then come back (recommended)
   - Use placeholder URL, update later
   - Use ngrok for local testing

### Step 3: Configure OAuth & Callbacks

Enter these URLs (replace `YOUR-APP-URL` with your actual deployed URL):

```
Auth Callback URL: https://YOUR-APP-URL/api/auth/callback
Load Callback URL: https://YOUR-APP-URL/api/load
Uninstall Callback URL: https://YOUR-APP-URL/api/uninstall
```

### Step 4: Set OAuth Scopes

Select these scopes:
- ✅ **Store Information** - Read-only
- ✅ **Products** - Read-only  
- ✅ **Content** - Modify (for widgets)
- ✅ **Customers** - Read-only (optional, for customer data)

### Step 5: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: `abc123...`
- **Client Secret**: `xyz789...`

**⚠️ SAVE THESE!** You'll need them for environment variables.

---

## Part 2: Configure Environment Variables

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Fill in Required Variables

Edit `.env.local` with your actual values:

```env
# From BigCommerce DevTools (Step 5 above)
BIGCOMMERCE_CLIENT_ID=your_actual_client_id
BIGCOMMERCE_CLIENT_SECRET=your_actual_client_secret

# Your deployed app URL (get from Vercel after deployment)
BIGCOMMERCE_APP_URL=https://your-app-name.vercel.app

# Generate a random string (minimum 32 characters)
JWT_SECRET=generate_a_long_random_string_here_32_chars_min

# Your existing BigCommerce API credentials (already have these)
BIGCOMMERCE_STORE_HASH=t48lqqxd8a
BIGCOMMERCE_ACCESS_TOKEN=mj7iz6x9io2hx9o43zifx4zv3s7ewrx
```

### How to Generate JWT_SECRET:

**Option A: Use Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Use OpenSSL**
```bash
openssl rand -hex 32
```

**Option C: Use a website**
- Go to: https://generate-secret.vercel.app
- Copy the generated secret

---

## Part 3: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "BigCommerce Quote App initial setup"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to: https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Add Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add ALL variables from your `.env.local`:
     - `BIGCOMMERCE_CLIENT_ID`
     - `BIGCOMMERCE_CLIENT_SECRET`
     - `BIGCOMMERCE_APP_URL` (use your Vercel URL)
     - `JWT_SECRET`
     - `BIGCOMMERCE_STORE_HASH`
     - `BIGCOMMERCE_ACCESS_TOKEN`

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your deployment URL: `https://your-app-name.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add BIGCOMMERCE_CLIENT_ID
vercel env add BIGCOMMERCE_CLIENT_SECRET
# ... add all other variables

# Deploy to production
vercel --prod
```

### Step 4: Update BigCommerce DevTools

1. Go back to: https://devtools.bigcommerce.com
2. Edit your app
3. Update callback URLs with your actual Vercel URL:
   ```
   https://your-app-name.vercel.app/api/auth/callback
   https://your-app-name.vercel.app/api/load
   https://your-app-name.vercel.app/api/uninstall
   ```
4. Save changes

---

## Part 4: Install App on Your Store

### Step 1: Get Install URL

Your app install URL format:
```
https://login.bigcommerce.com/app/{CLIENT_ID}/install
```

Replace `{CLIENT_ID}` with your actual Client ID.

Example:
```
https://login.bigcommerce.com/app/abc123xyz/install
```

### Step 2: Install the App

1. **Open install URL** in your browser
2. **Select your store** from the dropdown
3. Click "Confirm"
4. **Review permissions** and click "Authorize"
5. You'll be redirected to your app's admin interface

### Step 3: Verify Installation

After installation, you should see:
- Your app in BigCommerce admin sidebar (under Apps)
- Admin dashboard showing "Quote Requests" (empty initially)

---

## Part 5: Add Widget to Storefront

### Option A: Manual Theme Integration (Stencil)

Edit your theme's product page template:

**File: `templates/pages/product.html`**

```html
<!-- Add this before the closing </body> tag -->
<link rel="stylesheet" href="https://your-app-url.vercel.app/widgets/quote-widget.css">
<script>
  window.QUOTE_WIDGET_API_URL = 'https://your-app-url.vercel.app';
  window.QUOTE_WIDGET_STORE_HASH = '{{settings.store_hash}}';
</script>
<script src="https://your-app-url.vercel.app/widgets/quote-widget.js"></script>

<!-- Replace Add to Cart with Get a Quote button -->
{{#if product.can_purchase}}
  <button 
    data-quote-button
    data-product-id="{{product.id}}"
    data-product-name="{{product.title}}"
    data-product-sku="{{product.sku}}"
    data-product-price="{{product.price.without_tax.value}}"
    data-product-image="{{getImage product.main_image 'product_size' (cdn default_image)}}"
    class="button button--primary"
  >
    Get a Quote
  </button>
{{/if}}
```

### Option B: Add via Page Builder Widget (Future Enhancement)

Currently, widgets must be added manually. To create a Page Builder widget:

1. Create widget template in BigCommerce API
2. Register widget placement
3. Merchants can drag-and-drop via Page Builder

(This requires additional development - documented in Part 6)

---

## Part 6: Test the System

### Test 1: Admin Dashboard

1. Go to your BigCommerce admin
2. Click on your app in the sidebar
3. Verify the admin dashboard loads
4. Should show 0 quotes initially

### Test 2: Submit a Quote

1. Go to a product page on your store
2. Click "Get a Quote" button
3. Fill out the form:
   - Name: Test Customer
   - Email: test@example.com
   - Phone: 555-1234
   - Quantity: 5
4. Click "Submit Quote Request"
5. Should see success message

### Test 3: View Quote in Admin

1. Go back to app admin dashboard
2. Refresh the page
3. Should see the test quote
4. Try updating status (Pending → Contacted → Completed)

---

## Part 7: Troubleshooting

### Issue: "Installation Failed"

**Possible causes:**
- Incorrect callback URLs
- Wrong Client ID/Secret
- App not deployed

**Solution:**
1. Verify URLs in DevTools match your Vercel deployment
2. Check environment variables in Vercel
3. Check deployment logs in Vercel

### Issue: "Quote Not Submitting"

**Possible causes:**
- CORS issues
- Incorrect API URL in widget
- Missing store hash

**Solution:**
1. Check browser console for errors
2. Verify `QUOTE_WIDGET_API_URL` matches your Vercel URL
3. Ensure store hash is correct

### Issue: "Admin Dashboard Not Loading"

**Possible causes:**
- OAuth token not saved
- Incorrect load URL
- Missing permissions

**Solution:**
1. Reinstall the app
2. Check `/api/load` endpoint logs
3. Verify scopes in DevTools

### Issue: "File Storage Not Working"

**Note:** Vercel has read-only file system in serverless functions.

**Solution:**
- JSON files work for development/testing
- For production, migrate to database (PostgreSQL, MongoDB, etc.)
- Or use Vercel KV for serverless storage

---

## Part 8: Going to Production

### Checklist Before Launch

- [ ] Test on sandbox/development store first
- [ ] Verify all quotes save correctly
- [ ] Test admin dashboard functionality
- [ ] Add email notifications (optional)
- [ ] Set up monitoring/logging
- [ ] Add error tracking (Sentry, etc.)
- [ ] Configure custom domain (optional)
- [ ] Add analytics
- [ ] Test on mobile devices
- [ ] Review security settings

### Email Notifications (Optional)

To add email notifications when quotes are submitted:

1. Choose email service (Resend, SendGrid, Nodemailer)
2. Add API key to environment variables
3. Implement in `/app/api/bc/quotes/submit/route.ts`

Example with Resend:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'quotes@yourdomain.com',
  to: process.env.ADMIN_EMAIL,
  subject: 'New Quote Request',
  html: `<p>New quote from ${quote.customer.name}</p>`
})
```

---

## Part 9: Maintenance

### Viewing Quotes

Quotes are stored in `/data/quotes.json`. To backup:

```bash
# Download from Vercel
vercel download /data/quotes.json

# Or manually copy from deployment
```

### Updating the App

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel auto-deploys from GitHub
```

### Uninstalling

When a merchant uninstalls:
1. Store access token is removed
2. Quotes are kept for records
3. No further data is collected

---

## Support & Documentation

- **BigCommerce API Docs**: https://developer.bigcommerce.com
- **Vercel Docs**: https://vercel.com/docs
- **Jose (JWT) Docs**: https://github.com/panva/jose

---

## Summary

You've successfully:
✅ Created a BigCommerce app
✅ Set up OAuth authentication
✅ Deployed to Vercel
✅ Installed on your store
✅ Added quote functionality
✅ Created admin dashboard

Your customers can now request quotes instead of adding to cart!