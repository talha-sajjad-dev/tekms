# Etsy OAuth Setup Guide

## Overview
Etsy uses OAuth 2.0 for API access. This guide explains how to set up Etsy OAuth integration for TEKMS Listing Manager.

## Etsy API Version
This implementation uses **Etsy API v3** (Open API v3).

## Step 1: Create an Etsy Developer Account

1. Go to https://www.etsy.com/developers/
2. Sign in with your Etsy account
3. Click "Register as a Developer"
4. Accept the API Terms of Use

## Step 2: Create an App

1. Navigate to "Your Apps" in the developer portal
2. Click "Create a New App"
3. Fill in the required information:
   - **App Name**: TEKMS Listing Manager (or your preferred name)
   - **App Description**: Multi-marketplace listing management tool
   - **Tell us what you want to build**: Select appropriate category

## Step 3: Get Your Credentials

After creating your app, you'll see:

1. **Keystring** (this is like "Client ID" in other platforms)
2. **Shared Secret** (this is like "Client Secret" in other platforms)

**IMPORTANT**: Copy these values - you'll need them in the admin panel.

## Step 4: Configure Callback URL in Etsy

In your Etsy app settings, you MUST register the exact callback URL:

### For Production:
```
https://yourdomain.com/api/auth/callback/etsy
```

### For Development:
```
http://localhost:3000/api/auth/callback/etsy
```

**CRITICAL**: 
- Etsy calls this "Callback URL" (NOT "Redirect URI")
- The URL must match EXACTLY (no trailing slashes, exact protocol)
- You can add multiple callback URLs for different environments
- Etsy does NOT support wildcard URLs

## Step 5: Request API Scopes

In your Etsy app settings, request access to:

- ✅ `listings_r` - Read shop listings
- ✅ `listings_w` - Write/update shop listings  
- ✅ `shops_r` - Read shop information
- ✅ `transactions_r` - Read transaction data (optional)

## Step 6: Configure in TEKMS Admin Panel

1. Log into TEKMS as admin
2. Navigate to **Admin > System Settings**
3. Go to **OAuth Platforms** tab
4. Find **Etsy** section
5. Enter your credentials:

```
Keystring: [your Etsy keystring]
Shared Secret: [your Etsy shared secret]
Callback URL: https://yourdomain.com/api/auth/callback/etsy
```

6. Click **Save Etsy Settings**

## Step 7: Test the Connection

1. Log in as a regular user
2. Go to **Stores** page
3. Click **Connect Etsy Store**
4. You'll be redirected to Etsy
5. Grant permissions to your app
6. You'll be redirected back with a success message

## Etsy OAuth Flow

```
User clicks "Connect Etsy"
    ↓
Generate PKCE challenge and state token
    ↓
Redirect to Etsy authorization URL
    ↓
User grants permissions on Etsy
    ↓
Etsy redirects to callback URL with code
    ↓
Exchange code for access token (with PKCE)
    ↓
Fetch shop information
    ↓
Save store connection to database
    ↓
Redirect user to stores page with success
```

## Important Etsy API Details

### Base URLs
- **Authorization**: https://www.etsy.com/oauth/connect
- **Token Exchange**: https://api.etsy.com/v3/public/oauth/token
- **API Base**: https://openapi.etsy.com/v3

### PKCE Required
Etsy requires PKCE (Proof Key for Code Exchange) for security:
- Challenge Method: S256 (SHA-256)
- We generate this automatically in the code

### Token Expiration
- Access tokens expire after 3600 seconds (1 hour)
- Refresh tokens can be used to get new access tokens
- We automatically handle token refresh

### Rate Limits
Etsy has rate limits on API calls:
- Check Etsy documentation for current limits
- We implement rate limiting in our code

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: The callback URL in your code doesn't match what's registered in Etsy
**Solution**: 
1. Check your .env file: `NEXTAUTH_URL=https://yourdomain.com`
2. Verify in Etsy app settings: callback URL is exactly `https://yourdomain.com/api/auth/callback/etsy`
3. No trailing slashes
4. Protocol must match (http vs https)

### Error: "invalid_request"
**Cause**: Missing or invalid parameters
**Solution**: 
1. Verify Keystring and Shared Secret are correct
2. Check that all required scopes are requested
3. Ensure PKCE challenge is properly generated

### Error: "access_denied"
**Cause**: User denied permissions or app not approved
**Solution**:
1. User must grant all requested permissions
2. Check that your app has the required scopes enabled in Etsy developer portal

### Error: "No Etsy shop found"
**Cause**: User's Etsy account doesn't have a shop
**Solution**: User must create an Etsy shop before connecting

## Etsy-Specific Features

### Shop Information Available
After successful connection, we store:
- Shop ID
- Shop name
- Shop URL
- User information
- Active listings count

### Available API Operations
With proper scopes, you can:
- Read/write product listings
- Update inventory
- Manage product images
- Set pricing
- Control availability

## Security Notes

1. **Never expose** your Shared Secret in client-side code
2. **Always use HTTPS** in production (required by Etsy)
3. **Store tokens encrypted** in database (we do this automatically)
4. **Implement token refresh** before expiration (automated)
5. **Validate state parameter** to prevent CSRF attacks (implemented)

## Production Checklist

Before going live:

- [ ] Register production callback URL in Etsy app
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Enable HTTPS/SSL certificate
- [ ] Test OAuth flow end-to-end
- [ ] Verify token refresh works
- [ ] Test with real Etsy shop
- [ ] Check rate limiting is working
- [ ] Monitor API usage in Etsy dashboard

## Additional Resources

- Etsy API v3 Documentation: https://developers.etsy.com/documentation/
- Etsy Developer Forum: https://community.etsy.com/t5/Etsy-Developer-API/bd-p/developers
- OAuth 2.0 RFC: https://tools.ietf.org/html/rfc6749
- PKCE RFC: https://tools.ietf.org/html/rfc7636

## Support

If you encounter issues:
1. Check Etsy API status page
2. Review Etsy developer forums
3. Verify all URLs and credentials match exactly
4. Check server logs for detailed error messages
5. Test with Etsy's OAuth playground first