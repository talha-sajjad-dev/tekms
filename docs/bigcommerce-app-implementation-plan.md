# BigCommerce "Get a Quote" App - Implementation Plan

## Project Overview
Transform this Next.js app into a BigCommerce app that adds "Get a Quote" functionality to your store.

## Prerequisites Checklist

### Before We Start Building:

1. **BigCommerce DevTools Account** ⚠️ REQUIRED
   - Go to: https://devtools.bigcommerce.com
   - Create account (free)
   - This is where you'll register your app

2. **Deployment URL** (for testing)
   - Option A: Deploy to Vercel now for dev URL
   - Option B: Use ngrok for local testing
   - Option C: Deploy after building (we'll use placeholder URLs)

3. **Database Decision**
   - JSON files (simple, already in plan)
   - PostgreSQL (recommended for production)
   - MongoDB
   - Vercel KV (serverless)

## Implementation Phases

### Phase 1: App Registration & Setup (Manual Steps)

#### Step 1.1: Register App in BigCommerce DevTools

You need to manually complete this step:

1. Go to https://devtools.bigcommerce.com
2. Click "Create an App"
3. Fill in details:
   ```
   App Name: Quote Request System
   App Summary: Add "Get a Quote" functionality to your products
   
   Callback URLs:
   Auth Callback: https://your-app-url/api/auth/callback
   Load Callback: https://your-app-url/api/load
   Uninstall Callback: https://your-app-url/api/uninstall
   
   OAuth Scopes:
   ✓ Products (read-only)
   ✓ Store Information (read-only)
   ✓ Content (modify) - for widgets
   ✓ Customers (read-only)
   ```

4. Save and get credentials:
   - Client ID
   - Client Secret

#### Step 1.2: Add Environment Variables

Add to `.env.local`:
```env
# BigCommerce App Credentials
BIGCOMMERCE_CLIENT_ID=your_client_id_here
BIGCOMMERCE_CLIENT_SECRET=your_client_secret_here
BIGCOMMERCE_APP_URL=https://your-app-url

# JWT Secret (generate random string)
JWT_SECRET=your_random_jwt_secret_here

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://...

# Email (Resend)
RESEND_API_KEY=your_resend_key

# Admin email for notifications
ADMIN_EMAIL=your-email@example.com
```

### Phase 2: Install Dependencies

```bash
npm install jsonwebtoken
npm install @types/jsonwebtoken --save-dev
npm install jose  # Modern JWT library for Next.js
npm install resend  # Email service
```

### Phase 3: Build Authentication System

Files to create:
1. `types/bigcommerce-app.ts` - TypeScript types
2. `lib/bigcommerce-app/auth.ts` - OAuth helpers
3. `lib/bigcommerce-app/jwt.ts` - JWT verification
4. `lib/bigcommerce-app/storage.ts` - Store access tokens
5. `app/api/auth/callback/route.ts` - OAuth callback
6. `app/api/load/route.ts` - Load admin interface
7. `app/api/uninstall/route.ts` - Handle uninstall

### Phase 4: Build Admin Interface

Files to create:
1. `app/bc-admin/page.tsx` - Main admin dashboard
2. `app/bc-admin/layout.tsx` - Admin layout
3. `components/bc-admin/quote-list.tsx` - List quotes
4. `components/bc-admin/quote-details.tsx` - Quote details
5. `app/api/bc/quotes/list/route.ts` - API for quotes
6. `app/api/bc/quotes/[id]/route.ts` - Update quote status

### Phase 5: Build Widget System

Files to create:
1. `app/api/bc/widgets/register/route.ts` - Register widget
2. `public/widgets/quote-button.html` - Widget template
3. `public/widgets/quote-modal.js` - Modal JavaScript
4. `public/widgets/quote-styles.css` - Widget styles
5. `app/api/bc/quotes/submit/route.ts` - Submit quote

### Phase 6: Email Notifications

Files to create:
1. `lib/email/templates/quote-admin.tsx` - Admin email
2. `lib/email/templates/quote-customer.tsx` - Customer email
3. `lib/email/send.ts` - Email sender

## File Structure

```
/app
  /api
    /auth
      /callback
        route.ts          # OAuth callback handler
    /load
      route.ts            # Load admin panel
    /uninstall
      route.ts            # Uninstall handler
    /bc
      /quotes
        /list
          route.ts        # Get all quotes
        /submit
          route.ts        # Submit new quote
        /[id]
          route.ts        # Update quote
      /widgets
        /register
          route.ts        # Register widget with BC
  /bc-admin
    page.tsx              # Admin dashboard
    layout.tsx            # Admin layout

/components
  /bc-admin
    quote-list.tsx
    quote-details.tsx

/lib
  /bigcommerce-app
    auth.ts               # OAuth functions
    jwt.ts                # JWT verification
    storage.ts            # Token storage
    api.ts                # BC API client
  /email
    send.ts
    /templates
      quote-admin.tsx
      quote-customer.tsx

/types
  bigcommerce-app.ts      # App types
  quote.ts                # Quote types

/public
  /widgets
    quote-button.html     # Widget template
    quote-modal.js        # Modal JavaScript
    quote-styles.css      # Widget styles

/data
  stores.json             # Store access tokens
  quotes.json             # Quote requests
```

## Data Models

### Store Data (stores.json)
```typescript
{
  "stores": {
    "stores/abc123": {
      "accessToken": "encrypted_token",
      "scope": "store_v2_products_read_only",
      "storeHash": "abc123",
      "installedAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Quote Data (quotes.json)
```typescript
{
  "quotes": [
    {
      "id": "quote_123",
      "storeHash": "abc123",
      "createdAt": "2025-01-01T00:00:00Z",
      "status": "pending",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "product": {
        "id": 123,
        "name": "Product Name",
        "sku": "SKU-001",
        "price": 99.99
      },
      "quantity": 10,
      "notes": "Bulk order request"
    }
  ]
}
```

## Widget Implementation

### Widget Flow
```
1. Merchant installs app
2. App auto-creates widget template
3. Merchant adds widget to product page via Page Builder
4. Widget shows "Get a Quote" button
5. Customer clicks → modal opens
6. Customer fills form → submits
7. Quote stored in app
8. Emails sent (admin + customer)
9. Admin manages in BC admin panel
```

### Widget Placement Options
- Product pages (next to Add to Cart)
- Category pages
- Custom pages
- Via Stencil theme (optional)

## Security Considerations

1. **OAuth Flow**
   - Verify state parameter
   - Validate scope
   - Secure token storage

2. **Signed Requests**
   - Verify JWT signatures
   - Check timestamp
   - Validate store hash

3. **API Rate Limiting**
   - Implement rate limiting
   - Handle 429 responses
   - Queue requests

4. **Data Privacy**
   - Encrypt access tokens
   - GDPR compliance
   - Data retention policy

## Testing Strategy

### Local Testing
1. Use ngrok for local HTTPS
2. Register app with ngrok URL
3. Install on sandbox store
4. Test OAuth flow
5. Test widget placement

### Production Testing
1. Deploy to Vercel
2. Update callback URLs
3. Test on real store
4. Test quote submission
5. Test email notifications

## Deployment Checklist

- [ ] Environment variables configured
- [ ] App registered in DevTools
- [ ] OAuth flow tested
- [ ] Admin interface working
- [ ] Widgets rendering correctly
- [ ] Emails sending properly
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting in place
- [ ] Security review complete

## Next Steps

1. **YOU NEED TO DO (Manual)**:
   - Register app at https://devtools.bigcommerce.com
   - Get Client ID and Client Secret
   - Decide on deployment URL
   - Get Resend API key (for emails)

2. **I WILL BUILD**:
   - All authentication code
   - Admin dashboard
   - Widget system
   - Quote management
   - Email system

Ready to start? Confirm you have or will get:
- BigCommerce DevTools credentials
- Deployment URL (or use placeholder)
- Resend API key (or alternative email service)