# Shopify App Setup Guide

## Prerequisites
You MUST create a Shopify app BEFORE users can connect their stores. This is a one-time admin setup.

## Step 1: Create Shopify App (Admin Only)

### 1.1 Go to Shopify Partners
- Visit: https://partners.shopify.com
- Log in or create a Partners account (it's free)

### 1.2 Create Custom App
1. Click **Apps** in left sidebar
2. Click **Create app** button
3. Choose **Custom app** (not public app)
4. Fill in:
   - **App name**: TEKMS Listing Manager
   - **App URL**: https://tekms.app (or your domain)
   - **Allowed redirection URL(s)**: 
     ```
     https://tekms.app/api/auth/callback/shopify
     ```

### 1.3 Configure API Access
1. After creating, go to **Configuration** tab
2. Under **App setup**, click **Configure**
3. Select these **API scopes** (required for listing management):
   - ✅ `read_products` - Read product data
   - ✅ `write_products` - Create/edit/delete products
   - ✅ `read_inventory` - Read inventory levels
   - ✅ `write_inventory` - Update inventory
   - ✅ `read_locations` - Multi-location inventory
   - ✅ `read_product_listings` - Sales channels
   - ✅ `write_product_listings` - Manage sales channels
   - ✅ `read_collections` - Read categories
   - ✅ `write_collections` - Manage categories
   - ✅ `read_price_rules` - Read pricing rules
   - ✅ `write_price_rules` - Manage pricing
   - ✅ `read_orders` - Track sales
   - ✅ `read_files` - Product images
   - ✅ `write_files` - Upload images

4. Click **Save**

### 1.4 Get API Credentials
1. Go to **API credentials** tab
2. You'll see:
   - **API key** (this is your `client_id`)
   - **API secret key** (this is your `client_secret`)
3. **Copy both** - you'll need them in Step 2

## Step 2: Configure TEKMS Admin Settings

1. Log in to TEKMS as admin
2. Go to **Admin** → **System Settings**
3. Scroll to **Shopify OAuth** section
4. Enter the credentials from Step 1.4:
   - `shopify_client_id`: [paste API key from Shopify]
   - `shopify_client_secret`: [paste API secret key from Shopify]
   - `shopify_redirect_uri`: https://tekms.app/api/auth/callback/shopify
5. Click **Save Settings**

## Step 3: Test User Connection

Now regular users can connect their Shopify stores:

1. User goes to **Stores** → **Connect Store**
2. Clicks **Shopify**
3. Enters their shop domain: `my-store.myshopify.com`
4. Clicks **Connect to Shopify**
5. Gets redirected to Shopify
6. **Shopify shows**: "TEKMS Listing Manager wants to access your store"
7. User clicks **Install**
8. Redirected back to TEKMS
9. ✅ Store connected!

## Troubleshooting

### "Redirects to Shopify main page, no install screen"
**Problem**: Shopify app not created or client_id is wrong
**Solution**: 
- Make sure you completed Step 1 (create app at partners.shopify.com)
- Verify client_id in Admin Settings matches API key from Shopify
- Check redirect URI is exactly: `https://tekms.app/api/auth/callback/shopify`

### "Invalid redirect_uri"
**Problem**: Redirect URI in app doesn't match the one in code
**Solution**:
- Go to partners.shopify.com → Your app → Configuration
- Make sure **Allowed redirection URL(s)** contains: `https://tekms.app/api/auth/callback/shopify`
- Must be exact match including https://

### "Access denied" or "This app isn't approved"
**Problem**: App is in development mode
**Solution**: This is normal for custom apps. Users can still install it on their own stores.

## Required Scopes Breakdown

| Scope | What It Does |
|-------|-------------|
| `read_products` | View product data (title, price, description, etc.) |
| `write_products` | Create, update, delete products |
| `read_inventory` | Check stock levels |
| `write_inventory` | Update stock quantities |
| `read_locations` | See store locations for inventory |
| `read_product_listings` | View products in sales channels |
| `write_product_listings` | Publish/unpublish to sales channels |
| `read_collections` | View product collections (categories) |
| `write_collections` | Create/edit collections |
| `read_price_rules` | View discounts and pricing rules |
| `write_price_rules` | Create/edit pricing rules |
| `read_orders` | View order data for analytics |
| `read_files` | Access product images/videos |
| `write_files` | Upload new product media |

## Security Notes

- ✅ Uses OAuth 2.0 (industry standard)
- ✅ Access tokens are encrypted (AES-256-GCM) before storing
- ✅ CSRF protection with state tokens
- ✅ Offline access mode (no user re-authentication needed)
- ✅ Scopes follow principle of least privilege

## Support

If users have issues connecting:
1. Check Admin Settings have correct credentials
2. Verify app exists at partners.shopify.com
3. Confirm redirect URI matches exactly
4. Check Shopify Partners dashboard for any app errors