# Shopify Partners App Setup - Multi-Tenant SaaS

## Overview
This guide shows how to create a **Public App** in Shopify Partners that works for unlimited users and stores (proper SaaS setup).

## Prerequisites
- Your TEKMS app deployed at: `https://tekms.app`
- Shopify Partners account (free)

## Step-by-Step Setup

### 1. Create Shopify Partners Account

1. Go to: **https://partners.shopify.com**
2. Click **"Join Now"** (if you don't have an account)
3. Fill in:
   - Business name: TEKMS or your company name
   - Email: your@email.com
   - Create password
4. Complete registration

### 2. Create New App

1. Log in to Shopify Partners dashboard
2. Click **"Apps"** in left sidebar
3. Click **"Create app"** button
4. Choose **"Create app manually"** (NOT custom app)
5. Fill in app details:

```
App name: TEKMS Listing Manager
App URL: https://tekms.app
```

6. Click **"Create app"**

### 3. Configure App Settings

#### 3.1 App Setup
1. Go to **Configuration** → **App setup**
2. Set **Embedded app** to OFF (we use OAuth, not embedded)
3. **Allowed redirection URL(s)** - Add:
   ```
   https://tekms.app/api/auth/callback/shopify
   ```
4. Click **Save**

#### 3.2 Request Access Scopes
1. Still in **Configuration** → **App setup**
2. Scroll to **Admin API access scopes**
3. Select these scopes:

**Products & Inventory:**
- ✅ `read_products` - Read product data
- ✅ `write_products` - Create/edit/delete products
- ✅ `read_inventory` - Read inventory levels
- ✅ `write_inventory` - Update stock
- ✅ `read_locations` - Multi-location inventory

**Product Listings & Collections:**
- ✅ `read_product_listings` - View sales channel products
- ✅ `write_product_listings` - Manage sales channels
- ✅ `read_collections` - View collections/categories
- ✅ `write_collections` - Manage collections

**Pricing & Orders:**
- ✅ `read_price_rules` - View pricing rules
- ✅ `write_price_rules` - Create/edit pricing
- ✅ `read_orders` - Track sales data

**Media:**
- ✅ `read_files` - Access product images/videos
- ✅ `write_files` - Upload media

4. Click **Save** at bottom of page

### 4. Get API Credentials

1. Go to **Overview** tab
2. Find **API credentials** section
3. You'll see:
   - **Client ID** (also called API key)
   - **Client secret** (click "Show" to reveal)

4. **COPY BOTH** - you'll need them in Step 5

Example:
```
Client ID: abc123def456ghi789jkl012mno345pq
Client secret: shpss_abc123def456...
```

### 5. Enter Credentials in TEKMS

1. Log in to TEKMS as **admin**
2. Go to **Admin** → **System Settings**
3. Scroll to **Shopify OAuth** section
4. Enter:

```
shopify_client_id: [paste Client ID from Step 4]
shopify_client_secret: [paste Client secret from Step 4]
shopify_redirect_uri: https://tekms.app/api/auth/callback/shopify
```

5. Click **Save Settings**

### 6. Test User Connection Flow

Now ANY user can connect their Shopify store:

1. User logs in to TEKMS
2. Goes to **Stores** → **Connect Store**
3. Clicks **Shopify**
4. Enters their shop: `their-store.myshopify.com`
5. Clicks **Connect to Shopify**
6. **Redirected to Shopify**
7. Shopify shows: **"TEKMS Listing Manager wants to access your store"**
8. Lists all requested permissions
9. User clicks **Install app**
10. **Redirected back to TEKMS**
11. ✅ **Store connected!**

## App Distribution

### Development Mode (Default)
- App starts in development mode
- Only you and your team can install
- Perfect for testing

### Public Distribution (Optional)
When ready to go public:
1. Go to **Distribution** in Shopify Partners
2. Complete app listing requirements:
   - Privacy policy URL
   - Support contact
   - App description
   - Screenshots
3. Submit for review
4. Once approved, app appears in Shopify App Store

## Security Features

✅ **OAuth 2.0** - Industry standard authentication
✅ **Access tokens encrypted** - AES-256-GCM before storage  
✅ **CSRF protection** - State tokens prevent attacks
✅ **Offline access** - No re-authentication needed
✅ **Scope-based permissions** - Only request what's needed

## Troubleshooting

### "Invalid client_id"
**Problem**: Wrong API credentials in TEKMS
**Solution**: 
- Verify you copied Client ID from Shopify Partners **Overview** tab
- Make sure no extra spaces when pasting
- Must match exactly

### "Redirect URI mismatch"
**Problem**: Redirect URI in app doesn't match code
**Solution**:
- Shopify Partners → Configuration → App setup
- Allowed redirection URL(s) must be: `https://tekms.app/api/auth/callback/shopify`
- Must be exact match (https, no trailing slash)

### "This app isn't approved"
**Problem**: App in development mode
**Solution**: This is NORMAL for development. Users can still install on their own stores.

### "Missing required scope"
**Problem**: Forgot to check a scope in Step 3.2
**Solution**:
- Go back to Configuration → App setup
- Add missing scope
- Save
- Users need to reinstall to get new permissions

## Difference: Partners App vs Custom App

| Feature | Partners App (You chose) | Custom App (Store-specific) |
|---------|-------------------------|----------------------------|
| **Works for** | Unlimited stores | Only YOUR store |
| **Created in** | partners.shopify.com | Your store admin |
| **User installation** | Self-service OAuth | N/A |
| **Perfect for** | SaaS products | Personal tools |
| **Distribution** | Can go public | Can't distribute |
| **Scalability** | ✅ Unlimited | ❌ Single store |

## Next Steps

1. ✅ Complete Steps 1-5 above
2. Test connection with your own store first
3. Invite beta users to test
4. When ready, submit for public distribution (optional)

## Support

If you have issues:
- Check Shopify Partners dashboard for errors
- Verify all scopes are checked
- Confirm redirect URI matches exactly
- Test with a development store first