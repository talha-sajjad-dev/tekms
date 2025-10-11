# Implementation Roadmap - Store Connector System

## Overview

This roadmap outlines the step-by-step implementation of the hybrid OAuth + Legacy architecture for TEKMS Listing Manager.

---

## Phase 1: Database Foundation (Week 1)

### 1.1 Update Prisma Schema ✅ Ready to Implement

**File:** `prisma/schema.prisma`

**Changes:**
1. Add legacy permission fields to User model:
   ```prisma
   allowLegacyEtsyImport  Boolean @default(false)
   allowLegacyTikTokExport Boolean @default(false)
   ```

2. Create StoreConnection model (full schema in HYBRID_ARCHITECTURE_PLAN.md)

3. Update Product model:
   ```prisma
   storeConnectionId  String?
   importMethod       String @default("oauth") // "oauth" or "legacy"
   ```

4. Add isLegacy field to UserCredential model

**Commands:**
```bash
# Create migration
npx prisma migrate dev --name add-store-connections

# Generate Prisma client
npx prisma generate
```

### 1.2 Seed Legacy Permissions

**File:** `prisma/seed-legacy-permissions.ts`

Grant admin users legacy feature access:
```typescript
await db.user.updateMany({
  where: { role: 'ADMIN' },
  data: {
    allowLegacyEtsyImport: true,
    allowLegacyTikTokExport: true,
  }
})
```

---

## Phase 2: Permission System (Week 1)

### 2.1 Permission Helpers

**File:** `lib/auth/permissions.ts`

Functions to implement:
- `canUseLegacyEtsyImport(userId)` → boolean
- `canUseLegacyTikTokExport(userId)` → boolean  
- `canConnectStore(userId, platform)` → { allowed, reason? }
- `getStoreConnectionLimit(tier)` → number

### 2.2 Update Legacy Route Protection

**Files to update:**
- `app/api/etsy/import/route.ts`
- `app/api/tiktok/export/route.ts`

Add permission checks at the start of each route:
```typescript
const hasPermission = await canUseLegacyEtsyImport(session.user.id)
if (!hasPermission) {
  return NextResponse.json(
    { error: 'Permission required', useStoreConnections: true },
    { status: 403 }
  )
}
```

### 2.3 Update Legacy Page Components

**Files to update:**
- `app/etsy-import/page.tsx`
- `app/tiktok-export/page.tsx`

Add permission checks and upgrade prompts for unauthorized users.

---

## Phase 3: OAuth Infrastructure (Week 2)

### 3.1 Environment Variables Setup

**File:** `.env`

Add OAuth credentials:
```bash
# Shopify OAuth
SHOPIFY_CLIENT_ID="your_shopify_api_key"
SHOPIFY_CLIENT_SECRET="your_shopify_api_secret"
SHOPIFY_REDIRECT_URI="https://yourdomain.com/api/auth/callback/shopify"

# Etsy OAuth
ETSY_CLIENT_ID="your_etsy_client_id"
ETSY_CLIENT_SECRET="your_etsy_client_secret"
ETSY_REDIRECT_URI="https://yourdomain.com/api/auth/callback/etsy"

# BigCommerce (optional)
BIGCOMMERCE_CLIENT_ID="your_bc_client_id"
BIGCOMMERCE_CLIENT_SECRET="your_bc_client_secret"

# TikTok OAuth
TIKTOK_CLIENT_KEY="your_tiktok_client_key"
TIKTOK_CLIENT_SECRET="your_tiktok_client_secret"
TIKTOK_REDIRECT_URI="https://yourdomain.com/api/auth/callback/tiktok"
```

### 3.2 Platform OAuth Adapters

**Create directory:** `lib/platforms/`

**Files to create:**
- `lib/platforms/shopify/oauth.ts`
- `lib/platforms/shopify/api.ts`
- `lib/platforms/etsy/oauth.ts`
- `lib/platforms/etsy/api.ts`
- `lib/platforms/bigcommerce/connect.ts`
- `lib/platforms/tiktok/oauth.ts`

Each OAuth file implements:
- `getAuthUrl(userId, state)` - Generate OAuth URL
- `handleCallback(code, userId)` - Exchange code for tokens
- `refreshToken(connectionId)` - Refresh expired tokens

### 3.3 OAuth API Routes

**Create routes:**
```
app/api/auth/connect/
  ├── shopify/route.ts      # Initiates Shopify OAuth
  ├── etsy/route.ts         # Initiates Etsy OAuth
  ├── bigcommerce/route.ts  # Manual BigCommerce connection
  └── tiktok/route.ts       # Initiates TikTok OAuth

app/api/auth/callback/
  ├── shopify/route.ts      # Handles Shopify callback
  ├── etsy/route.ts         # Handles Etsy callback
  └── tiktok/route.ts       # Handles TikTok callback
```

Each route:
1. Verifies CSRF state
2. Exchanges code for tokens
3. Encrypts and stores tokens in StoreConnection
4. Redirects to success page

---

## Phase 4: Store Connections API (Week 2-3)

### 4.1 Store Connection CRUD

**File:** `app/api/stores/route.ts`

```typescript
GET    /api/stores          # List user's store connections
POST   /api/stores          # Create new connection (OAuth or manual)
```

**File:** `app/api/stores/[id]/route.ts`

```typescript
GET    /api/stores/[id]     # Get connection details
PATCH  /api/stores/[id]     # Update connection (reauth, toggle active)
DELETE /api/stores/[id]     # Disconnect store
```

**File:** `app/api/stores/[id]/sync/route.ts`

```typescript
POST   /api/stores/[id]/sync  # Trigger manual sync
```

### 4.2 Store Connection Operations

**File:** `lib/stores/operations.ts`

Functions:
- `createStoreConnection(userId, platform, authData)` - Create new connection
- `getStoreConnections(userId, platform?)` - Get user's connections
- `disconnectStore(userId, connectionId)` - Remove connection
- `syncStoreProducts(connectionId)` - Sync products from platform
- `getConnectionHealth(connectionId)` - Check if tokens valid

---

## Phase 5: Store Connections UI (Week 3)

### 5.1 Store Connections Page

**File:** `app/stores/page.tsx`

Components needed:
- List of connected stores (grouped by platform)
- Connect button for each platform
- Store cards showing: name, URL, status, product count, last synced
- Disconnect button per store
- Manual sync button per store

### 5.2 Connect Store Modal

**File:** `components/stores/connect-store-modal.tsx`

Features:
- Platform selection
- OAuth flow initiation
- Manual input for BigCommerce
- Loading states during OAuth
- Success/error feedback

### 5.3 Store Connection Status

**File:** `components/stores/connection-status.tsx`

Shows:
- ✅ Connected & Synced
- 🔄 Syncing...
- ⚠️ Needs Re-authentication
- ❌ Connection Error

---

## Phase 6: Product Management Updates (Week 3-4)

### 6.1 Unified Product List

**File:** `app/products/page.tsx`

Features:
- Show products from all sources (OAuth + legacy)
- Filter by: Platform, Store, Import Method, Status
- Columns: Image, Name, SKU, Price, Platform, Store, Status
- Bulk actions: Sync, Delete, Export
- Search integration (existing Meilisearch)

### 6.2 Product Import from Stores

**File:** `app/api/products/import/route.ts`

```typescript
POST /api/products/import
{
  storeConnectionId: string
  productIds?: string[]  // Optional: specific products
}
```

Fetches products from connected store and saves to database.

### 6.3 Product Detail/Edit

**File:** `app/products/[id]/edit/page.tsx`

Dynamic form based on:
- Platform (Etsy, Shopify, BigCommerce, TikTok)
- Import method (OAuth vs legacy)
- Platform-specific validation rules

---

## Phase 7: Admin Features (Week 4)

### 7.1 Admin User Permission Management

**File:** `app/admin/users/[userId]/page.tsx`

Sections:
- User basic info
- Current subscription
- **Legacy Feature Permissions** (toggles for Etsy/TikTok)
- Store connection limit override
- Grant/revoke permissions button

### 7.2 Admin Store Connections Overview

**File:** `app/admin/stores/page.tsx`

Features:
- View ALL users' store connections
- Filter by platform, status, user
- Force disconnect stores
- View connection health
- Platform API status monitoring

### 7.3 Admin Permission API

**File:** `app/api/admin/users/[userId]/permissions/route.ts`

```typescript
PUT /api/admin/users/[userId]/permissions
{
  allowLegacyEtsyImport: boolean
  allowLegacyTikTokExport: boolean
}
```

---

## Phase 8: Dashboard Integration (Week 5)

### 8.1 Updated Dashboard Navigation

**File:** `app/dashboard/page.tsx`

Navigation structure:
```
Main Features:
- Products (all products)
- Store Connections (OAuth stores)
- Billing
- Settings

Legacy Features (conditional):
- Etsy Import (if permission granted)
- TikTok Export (if permission granted)
```

### 8.2 Dashboard Stats

Update to show:
- Total products (by import method)
- Connected stores count
- Products by platform
- Recent syncs
- Connection health warnings

---

## Phase 9: Subscription Enforcement (Week 5)

### 9.1 Store Connection Limits

Implement checks in:
- `app/api/auth/connect/*/route.ts` - Before OAuth
- `app/api/stores/route.ts` - Before manual connection
- UI - Disable connect button if at limit

Limits by tier:
- FREE: 1 store total
- STARTER: 2 stores total
- PROFESSIONAL: Unlimited, Etsy + TikTok access
- ENTERPRISE: Unlimited, all features

### 9.2 Platform Access by Tier

Block Etsy and TikTok OAuth for non-Professional users:
```typescript
if ((platform === 'ETSY' || platform === 'TIKTOK') && 
    tier !== 'PROFESSIONAL' && tier !== 'ENTERPRISE') {
  return { allowed: false, reason: 'Upgrade to Professional' }
}
```

### 9.3 Upgrade Prompts

**File:** `components/upgrade-prompt.tsx`

Show when:
- User hits store connection limit
- User tries to connect Etsy/TikTok without Pro tier
- User tries to use legacy feature without permission

---

## Phase 10: Testing & Polish (Week 6)

### 10.1 OAuth Flow Testing

Test each platform:
- [ ] Shopify OAuth complete flow
- [ ] Etsy OAuth complete flow
- [ ] BigCommerce manual connection
- [ ] TikTok OAuth complete flow
- [ ] Token refresh logic
- [ ] Error handling (denied, expired, invalid)

### 10.2 Permission System Testing

- [ ] Legacy features blocked for regular users
- [ ] Admin can always access legacy features
- [ ] Admin can grant permissions to users
- [ ] Permissions persist across sessions
- [ ] Proper error messages when denied

### 10.3 Product Sync Testing

- [ ] Import products from Shopify
- [ ] Import products from Etsy (OAuth)
- [ ] Import products from BigCommerce
- [ ] Sync updates to products
- [ ] Handle deleted products on platform
- [ ] Legacy import still works (with permission)

### 10.4 Subscription Limits

- [ ] FREE user limited to 1 store
- [ ] STARTER user limited to 2 stores
- [ ] PRO user unlimited stores
- [ ] Etsy/TikTok blocked for non-Pro
- [ ] Upgrade prompts shown correctly

---

## Phase 11: Documentation (Week 6)

### 11.1 User Documentation

**Create:**
- `docs/USER_GUIDE.md` - How to connect stores
- `docs/LEGACY_FEATURES.md` - When to use legacy vs OAuth
- `docs/FAQ.md` - Common questions

### 11.2 Admin Documentation

**Create:**
- `docs/ADMIN_GUIDE.md` - Managing users & permissions
- `docs/PLATFORM_SETUP.md` - OAuth app registration guide

### 11.3 Developer Documentation

**Create:**
- `docs/OAUTH_FLOW.md` - How OAuth integration works
- `docs/PLATFORM_ADAPTERS.md` - Adding new platforms
- `docs/API_REFERENCE.md` - API endpoints

---

## Deployment Checklist

### Pre-Deployment

- [ ] All OAuth apps registered in production (Etsy, Shopify, TikTok)
- [ ] Production environment variables configured
- [ ] Database migration tested on staging
- [ ] All tests passing
- [ ] Documentation complete

### Deployment Steps

1. **Backup database**
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed legacy permissions**
   ```bash
   npm run seed:legacy-permissions
   ```

4. **Deploy application**
   ```bash
   git push production main
   ```

5. **Verify OAuth redirects**
   - Test each platform's OAuth flow
   - Verify redirect URIs match registered apps

6. **Monitor errors**
   - Check Sentry/logging for OAuth errors
   - Monitor database connections
   - Watch for token refresh failures

### Post-Deployment

- [ ] Test Google OAuth (existing)
- [ ] Test Shopify OAuth (new)
- [ ] Test Etsy OAuth (new)
- [ ] Test BigCommerce connection (new)
- [ ] Test legacy feature permissions
- [ ] Test admin permission management
- [ ] Update pricing page with new features
- [ ] Send announcement email to users

---

## Success Metrics

Track these after deployment:

**Technical:**
- OAuth success rate per platform
- Token refresh success rate
- Store sync completion rate
- Average sync time per platform
- API error rates

**Business:**
- Store connections created (per platform)
- Legacy feature usage vs OAuth
- Upgrade rate (Free → Pro for Etsy/TikTok)
- Support tickets related to connections
- User satisfaction with OAuth vs legacy

**Adoption:**
- % of users with ≥1 store connected
- Average stores per user (by tier)
- Most popular platform
- Legacy feature usage decline over time

---

## Risk Mitigation

### OAuth Token Expiry
- Implement auto-refresh before expiry
- Alert users when manual re-auth needed
- Queue failed syncs for retry after re-auth

### Platform API Changes
- Version API calls where possible
- Monitor platform developer changelogs
- Implement graceful degradation
- Show clear error messages to users

### Migration Issues
- Keep legacy features working during rollout
- Allow both systems to coexist
- Gradual migration, not forced
- Clear communication about changes

### User Confusion
- Clear UI distinction: OAuth vs Legacy
- Tooltips explaining differences
- Migration guide for existing users
- Support documentation ready

---

## Future Enhancements (Post-MVP)

### Phase 12+: Advanced Features

1. **Bi-directional Sync**
   - Changes in TEKMS push to platforms
   - Webhook listeners for platform changes
   - Conflict resolution UI

2. **Bulk Operations**
   - Bulk import from multiple stores
   - Bulk price updates across platforms
   - Bulk category mapping

3. **Advanced Product Editor**
   - Side-by-side platform comparison
   - Template system for common products
   - AI-powered description optimization

4. **Analytics Dashboard**
   - Products per platform over time
   - Sync health metrics
   - Platform performance comparison
   - Revenue tracking per platform

5. **Scheduled Syncs**
   - Cron jobs for automatic syncs
   - Custom sync schedules per store
   - Smart sync (only changed products)

6. **Multi-user Workspaces**
   - Team access to stores
   - Role-based permissions within workspace
   - Activity logs

---

## Implementation Order (Recommended)

### Week 1: Foundation
- Day 1-2: Update Prisma schema, migrations
- Day 3-4: Permission system (helpers, route guards)
- Day 5: Update legacy pages with permission checks

### Week 2: OAuth Infrastructure
- Day 1-2: Shopify OAuth (easiest to implement)
- Day 3-4: Store Connections API
- Day 5: Testing & debugging Shopify flow

### Week 3: UI Development
- Day 1-3: Store Connections page UI
- Day 4-5: Connect Store modal & OAuth flows

### Week 4: Additional Platforms
- Day 1-2: Etsy OAuth
- Day 3-4: BigCommerce connection
- Day 5: Testing all platforms

### Week 5: Product Management
- Day 1-2: Unified product list updates
- Day 3-4: Product import from stores
- Day 5: Platform-specific editors

### Week 6: Admin & Polish
- Day 1-2: Admin permission management
- Day 3-4: Subscription enforcement
- Day 5: Testing, bug fixes, documentation

---

## Current Status

✅ **Completed:**
- Architecture planning
- Hybrid approach approved
- Documentation created

🔄 **In Progress:**
- Implementation roadmap

⏳ **Next Steps:**
1. Switch to Code mode
2. Update Prisma schema
3. Implement permission system
4. Start Shopify OAuth integration

**Ready to begin implementation!** 🚀