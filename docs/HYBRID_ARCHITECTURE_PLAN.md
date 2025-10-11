# Hybrid Architecture: OAuth + Legacy Features

## Approved Architecture ✅

**Primary:** OAuth-based Store Connectors (modern SaaS approach)
**Secondary:** Legacy direct API features (admin + special permissions only)

---

## Two-Tier System

### Tier 1: OAuth Store Connectors (All Users)
- Click "Connect Store" → OAuth flow
- No API keys needed
- User-friendly, professional
- Primary product management interface

### Tier 2: Legacy Direct API (Admin + Authorized Users)
- Current Etsy Import feature (scraping-based)
- Current TikTok Export feature (Excel-based)
- Requires no store connection
- Available to:
  - Admins (always)
  - Users granted special permission by admin

---

## Updated Prisma Schema

```prisma
// User model - add legacy feature permissions
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(USER)
  
  // NEW: Legacy feature permissions
  allowLegacyEtsyImport  Boolean @default(false)  // Admin can enable per user
  allowLegacyTikTokExport Boolean @default(false) // Admin can enable per user
  
  // Relations
  accounts         Account[]
  sessions         Session[]
  subscription     Subscription?
  storeConnections StoreConnection[] // NEW: OAuth connections
  credentials      UserCredential[]  // KEEP: For legacy features
  usageRecords     UsageRecord[]
  products         Product[]
  syncJobs         SyncJob[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
}

// NEW: Store Connections (OAuth-based)
model StoreConnection {
  id                String   @id @default(cuid())
  userId            String
  platform          Platform
  
  // Store Info
  storeName         String
  storeUrl          String?
  externalStoreId   String   // Platform's unique store ID
  
  // OAuth Tokens (encrypted)
  accessToken       String   @db.Text
  refreshToken      String?  @db.Text
  tokenExpiresAt    DateTime?
  
  // Scopes granted
  scopes            String[]
  
  // Status
  isActive          Boolean  @default(true)
  lastSyncedAt      DateTime?
  syncStatus        String?  // "connected", "error", "needs_reauth"
  syncError         String?
  
  // Platform-specific metadata
  metadata          Json?
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  products Product[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform, externalStoreId])
  @@index([userId, platform])
  @@index([userId, isActive])
}

// KEEP: UserCredential for legacy features
model UserCredential {
  id           String   @id @default(cuid())
  userId       String
  platform     Platform
  encryptedKey String   @db.Text
  label        String?
  isActive     Boolean  @default(true)
  
  // NEW: Mark as legacy
  isLegacy     Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform, label])
  @@index([userId, platform])
}

// Products - support both OAuth connections AND legacy imports
model Product {
  id                  String   @id @default(cuid())
  userId              String
  platform            Platform
  externalId          String
  
  // Connection source (nullable for legacy imports)
  storeConnectionId   String?
  importMethod        String   @default("oauth") // "oauth" or "legacy"
  
  // Core fields
  name                String
  description         String?  @db.Text
  sku                 String?
  price               Decimal  @db.Decimal(10, 2)
  compareAtPrice      Decimal? @db.Decimal(10, 2)
  
  // Search optimization
  searchVector        String?
  categories          String[]
  tags                String[]
  
  // Metadata
  images              Json?
  variants            Json?
  customFields        Json?
  platformData        Json?    // Store original platform data
  
  // Sync status
  lastSyncedAt        DateTime?
  syncStatus          String?
  syncError           String?
  
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  storeConnection   StoreConnection? @relation(fields: [storeConnectionId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform, externalId, importMethod])
  @@index([userId, platform])
  @@index([storeConnectionId])
  @@index([importMethod])
}
```

---

## Navigation Structure

### User Dashboard Navigation

```
┌─────────────────────────────────────────────────┐
│  Dashboard                                       │
├─────────────────────────────────────────────────┤
│  📦 Products          (All products view)        │
│  🔗 Store Connections (OAuth stores)             │
│  💳 Billing                                       │
│  ⚙️  Settings                                     │
│                                                   │
│  ──── LEGACY FEATURES (if authorized) ────       │
│  📥 Etsy Import       (Legacy scraper)           │
│  📤 TikTok Export     (Legacy Excel)             │
└─────────────────────────────────────────────────┘
```

### Admin Dashboard Additional Options

```
┌─────────────────────────────────────────────────┐
│  Admin Dashboard                                 │
├─────────────────────────────────────────────────┤
│  👥 Users Management                             │
│  💰 Subscriptions                                │
│  📊 Analytics                                     │
│  🔌 Store Connections (All users)                │
│  🎛️  Feature Permissions                         │
│     - Grant legacy Etsy import                   │
│     - Grant legacy TikTok export                 │
│  ⚙️  System Settings                             │
└─────────────────────────────────────────────────┘
```

---

## Feature Access Control

### Permission Helper Function

```typescript
// lib/auth/permissions.ts

export async function canUseLegacyEtsyImport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, allowLegacyEtsyImport: true }
  })
  
  // Admins always have access, or user has specific permission
  return user?.role === 'ADMIN' || user?.allowLegacyEtsyImport === true
}

export async function canUseLegacyTikTokExport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, allowLegacyTikTokExport: true }
  })
  
  return user?.role === 'ADMIN' || user?.allowLegacyTikTokExport === true
}

export async function canConnectStore(
  userId: string,
  platform: Platform
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      storeConnections: { where: { isActive: true } }
    }
  })
  
  if (!user) return { allowed: false, reason: 'User not found' }
  
  const connectionCount = user.storeConnections.length
  const tier = user.subscription?.tier || 'FREE'
  
  // Check platform access by tier
  if (platform === 'ETSY' || platform === 'TIKTOK') {
    if (tier !== 'PROFESSIONAL' && tier !== 'ENTERPRISE') {
      return { 
        allowed: false, 
        reason: 'Etsy and TikTok require Professional or Enterprise plan' 
      }
    }
  }
  
  // Check connection limits
  const limits = {
    FREE: 1,
    STARTER: 2,
    PROFESSIONAL: -1, // unlimited
    ENTERPRISE: -1    // unlimited
  }
  
  const limit = limits[tier]
  if (limit !== -1 && connectionCount >= limit) {
    return { 
      allowed: false, 
      reason: `Your ${tier} plan allows ${limit} store connection(s). Upgrade for more.` 
    }
  }
  
  return { allowed: true }
}
```

### Middleware for Legacy Routes

```typescript
// app/api/etsy/import/route.ts (existing, updated)

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // NEW: Check legacy permission
  const hasPermission = await canUseLegacyEtsyImport(session.user.id)
  if (!hasPermission) {
    return NextResponse.json(
      { 
        error: 'This feature requires special permission. Contact admin or use Store Connections instead.',
        useStoreConnections: true
      },
      { status: 403 }
    )
  }
  
  // Continue with existing Etsy import logic...
  // Mark imported products with importMethod: "legacy"
}
```

---

## Admin Feature Permission Management

### UI: Admin User Management

```
/admin/users/[userId]

┌─────────────────────────────────────────────────┐
│  User: john@example.com                          │
├─────────────────────────────────────────────────┤
│                                                   │
│  Basic Info:                                      │
│  Name: John Doe                                   │
│  Email: john@example.com                          │
│  Role: USER                                       │
│  Subscription: STARTER                            │
│  Created: Jan 15, 2025                            │
│                                                   │
│  ──── SPECIAL PERMISSIONS ────                    │
│                                                   │
│  Legacy Features:                                 │
│  ☐ Allow Legacy Etsy Import                      │
│  ☑ Allow Legacy TikTok Export                    │
│                                                   │
│  Store Connection Overrides:                      │
│  Connection Limit: [Use plan default ▾]          │
│    Options: Use plan default, 1, 2, 5, Unlimited │
│                                                   │
│  [Save Permissions]                               │
└─────────────────────────────────────────────────┘
```

### API: Update User Permissions

```typescript
// app/api/admin/users/[userId]/permissions/route.ts

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth()
  
  // Verify admin
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  
  const { allowLegacyEtsyImport, allowLegacyTikTokExport } = await req.json()
  
  const user = await db.user.update({
    where: { id: params.userId },
    data: {
      allowLegacyEtsyImport,
      allowLegacyTikTokExport
    }
  })
  
  return NextResponse.json({ success: true, user })
}
```

---

## User Interface Updates

### Dashboard - Conditional Legacy Features

```typescript
// app/dashboard/page.tsx

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id!
  
  // Check legacy permissions
  const canImportEtsy = await canUseLegacyEtsyImport(userId)
  const canExportTikTok = await canUseLegacyTikTokExport(userId)
  
  return (
    <div>
      {/* Main navigation */}
      <nav>
        <Link href="/products">Products</Link>
        <Link href="/stores">Store Connections</Link>
        <Link href="/billing">Billing</Link>
        <Link href="/settings">Settings</Link>
        
        {/* Legacy features - conditional */}
        {(canImportEtsy || canExportTikTok) && (
          <div className="border-t mt-4 pt-4">
            <p className="text-xs text-muted-foreground mb-2">
              Legacy Features
            </p>
            {canImportEtsy && (
              <Link href="/etsy-import">
                📥 Etsy Import (Legacy)
              </Link>
            )}
            {canExportTikTok && (
              <Link href="/tiktok-export">
                📤 TikTok Export (Legacy)
              </Link>
            )}
          </div>
        )}
      </nav>
    </div>
  )
}
```

### Legacy Feature Pages - Permission Notice

```typescript
// app/etsy-import/page.tsx (existing, updated)

export default async function EtsyImportPage() {
  const session = await auth()
  const hasPermission = await canUseLegacyEtsyImport(session?.user?.id!)
  
  if (!hasPermission) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Legacy Etsy Import</CardTitle>
            <CardDescription>
              This feature requires special permission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Permission Required</AlertTitle>
              <AlertDescription>
                This legacy feature is only available to admins and specially authorized users.
                <br /><br />
                <strong>Recommended:</strong> Use Store Connections instead for a modern,
                OAuth-based integration with Etsy.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <Button asChild>
                <Link href="/stores">
                  Connect Etsy Store (OAuth)
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Existing Etsy import UI...
  return (
    <div>
      {/* Show legacy import form with warning */}
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Legacy Feature</AlertTitle>
        <AlertDescription>
          You have special permission to use this legacy import tool.
          For better reliability, consider using Store Connections instead.
        </AlertDescription>
      </Alert>
      
      {/* Existing import form */}
    </div>
  )
}
```

---

## Migration Strategy

### Phase 1: Add New Fields (Non-Breaking)
```sql
-- Add legacy permission fields to User table
ALTER TABLE "User" 
ADD COLUMN "allowLegacyEtsyImport" BOOLEAN DEFAULT false,
ADD COLUMN "allowLegacyTikTokExport" BOOLEAN DEFAULT false;

-- Create StoreConnection table
-- (Full schema as defined above)

-- Add importMethod to Product
ALTER TABLE "Product"
ADD COLUMN "importMethod" TEXT DEFAULT 'oauth',
ADD COLUMN "storeConnectionId" TEXT;

-- Set all existing products to legacy
UPDATE "Product" SET "importMethod" = 'legacy' WHERE "importMethod" IS NULL;
```

### Phase 2: Grant Legacy Permissions
```typescript
// scripts/grant-legacy-permissions.ts
// Run once to grant current users legacy access

const users = await db.user.findMany()

for (const user of users) {
  await db.user.update({
    where: { id: user.id },
    data: {
      // Grant legacy permissions to existing users or admins
      allowLegacyEtsyImport: user.role === 'ADMIN',
      allowLegacyTikTokExport: user.role === 'ADMIN',
    }
  })
}
```

### Phase 3: Deploy New Features
- Store Connections UI
- OAuth flows
- Updated navigation with conditional legacy features

### Phase 4: Gradual Migration (Optional)
- Encourage users to switch to OAuth
- Eventually deprecate legacy features
- Keep as admin-only tools

---

## Implementation Priority

### Week 1-2: Foundation
1. Update Prisma schema
2. Run migrations
3. Add permission helper functions
4. Update existing legacy routes with permission checks

### Week 2-3: OAuth Infrastructure
1. Implement Etsy OAuth flow
2. Implement Shopify OAuth flow
3. Implement BigCommerce connection
4. Store Connections database operations

### Week 3-4: UI Development
1. Store Connections page (`/stores`)
2. Connect Store modal with OAuth flows
3. Update dashboard navigation (conditional legacy)
4. Admin permission management UI

### Week 4-5: Product Management
1. Unified product list (both OAuth and legacy)
2. Platform-specific editors
3. Import from connected stores
4. Sync engine

### Week 5-6: Polish & Testing
1. Subscription enforcement
2. Error handling & edge cases
3. Documentation
4. User migration guide

---

## Key Benefits of Hybrid Approach

✅ **Backwards Compatible**: Existing features still work
✅ **Modern for New Users**: OAuth is the default experience
✅ **Flexible**: Admin can grant legacy access as needed
✅ **Future-Proof**: Can deprecate legacy gradually
✅ **Professional**: OAuth is industry standard
✅ **Admin Control**: Granular permission management

---

## Next Steps - Approved for Implementation

1. **Update Prisma schema** with StoreConnection model + legacy permissions
2. **Create migration** to add new fields without breaking existing data
3. **Implement permission helpers** for legacy feature access
4. **Start with Shopify OAuth** (simplest to implement)
5. **Build Store Connections UI**
6. **Update navigation** to show legacy features conditionally

Ready to switch to Code mode and begin implementation! 🚀