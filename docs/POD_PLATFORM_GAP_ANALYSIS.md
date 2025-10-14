# POD Platform Gap Analysis
**Date:** 2025-01-14  
**Current Status:** Multi-store product sync implemented  
**Target:** Full omni-channel POD product management platform

## Executive Summary

Your current system successfully implements **basic multi-platform product syncing** (import from BigCommerce, Shopify, Etsy, TikTok), but is missing critical features needed for a complete POD (Print-on-Demand) platform that enables **centralized product creation**, **cross-channel publishing**, and **inventory synchronization**.

**Gap Coverage:** ~30% of full POD platform requirements met

---

## ✅ What You Currently Have

### 1. **Store Connection & Authentication** ✅
- OAuth-based store connections (BigCommerce, Shopify, Etsy, TikTok)
- Encrypted token storage ([`UserCredential`](../prisma/schema.prisma:194-211), [`StoreConnection`](../prisma/schema.prisma:224-264))
- Multi-store support per user
- Per-store pricing tier assignment

### 2. **Product Import (Pull Only)** ✅
- Import products from connected stores ([`app/api/stores/[id]/sync/route.ts`](../app/api/stores/[id]/sync/route.ts))
- Platform-specific adapters for each marketplace
- Background sync with progress tracking
- Rate limiting for BigCommerce API

### 3. **Product Storage** ✅
- Database storage for imported products ([`Product`](../prisma/schema.prisma:337-381) model)
- Platform-specific metadata preservation
- Image, variant, and custom field storage (JSON)

### 4. **Product Listing UI** ✅
- Advanced search and filtering ([`app/products/page.tsx`](../app/products/page.tsx))
- Bulk operations (price updates, tags, delete)
- Pagination (100 items per page)
- Quick edit sidebar

### 5. **Subscription Management** ✅
- Per-store pricing tiers ([`StorePricingTier`](../prisma/schema.prisma:301-331), [`StoreSubscription`](../prisma/schema.prisma:270-298))
- Automatic tier assignment based on product count
- Stripe integration ready

---

## ❌ Critical Missing Features

### 1. **Centralized Product Creation** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🔴 HIGH

**What's Missing:**
- Cannot create a product once and publish to multiple platforms
- No unified product creation form
- No platform-agnostic product model (currently all products are imports)

**ChatGPT Requirement:**
> "Centralized Listing Creation: Sellers can create or clone a product once → auto-list to multiple platforms"

**What's Needed:**
```typescript
// New model needed
model MasterProduct {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  baseSKU     String
  basePrice   Decimal
  
  // Master variants (color/size)
  variants    MasterVariant[]
  
  // Channel-specific listings
  channelListings ChannelListing[]
  
  // Design/mockup references
  designLibraryId String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ChannelListing {
  id                String  @id
  masterProductId   String
  storeConnectionId String
  platform          Platform
  externalId        String? // ID on the platform
  
  // Platform-specific overrides
  titleOverride     String?
  priceOverride     Decimal?
  descriptionOverride String?
  
  publishStatus     String  // "draft", "published", "failed"
  lastPushedAt      DateTime?
  
  masterProduct     MasterProduct     @relation(...)
  storeConnection   StoreConnection   @relation(...)
}
```

---

### 2. **Cross-Channel Publishing (Push)** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🔴 HIGH

**What's Missing:**
- No ability to push products TO platforms
- Only pull/import functionality exists
- No create/update API calls to platforms

**ChatGPT Requirement:**
> "Push listings across channels"
> "Push Back to Etsy/BigCommerce: Titles, descriptions, images, variants, price & inventory, category/taxonomy mappings"

**What's Needed:**
- Platform-specific **create product** API calls
- Platform-specific **update product** API calls
- Field mapping engine (your fields → platform fields)
- Error handling for API failures
- Retry logic with exponential backoff

**Example API Endpoints Needed:**
```typescript
// POST /api/products/master
// Create a master product

// POST /api/products/master/[id]/publish
// Publish to selected channels
{
  storeIds: ["store1", "store2"],
  publishSettings: {
    autoPublish: true,
    platformOverrides: {
      "ETSY": { tags: ["custom", "etsy"], occasion: "birthday" },
      "BIGCOMMERCE": { brand: "MyBrand", condition: "new" }
    }
  }
}

// New library needed: lib/platforms/publishers/
// - bigcommerce-publisher.ts
// - shopify-publisher.ts
// - etsy-publisher.ts
// - tiktok-publisher.ts
```

---

### 3. **Unified Data Normalization** ❌
**Status:** PARTIALLY IMPLEMENTED  
**Priority:** 🔴 HIGH

**What's Missing:**
- Products stored as-is from each platform (no normalization)
- No field mapping between platforms
- No category/taxonomy translation

**ChatGPT Requirement:**
> "Data Normalizer: Converts fields to a standard schema"
> "Mapping Engine: Connects shared + platform-specific fields"

**Current Problem:**
```typescript
// Current: Each product is platform-specific
{
  platform: "BIGCOMMERCE",
  platformData: { /* raw BigCommerce data */ }
}

// Needed: Normalized core + platform extensions
{
  // Normalized core
  title: "Standard Title",
  price: 29.99,
  sku: "TSH-001",
  
  // Platform mappings
  channelMappings: {
    "ETSY": {
      externalId: "123",
      platformTitle: "Handmade Title",
      etsyOccasion: "birthday",
      etsyRecipient: "women"
    },
    "BIGCOMMERCE": {
      externalId: "456",
      bcBrandId: 12,
      bcCondition: "new"
    }
  }
}
```

**What's Needed:**
```typescript
// New service layer
class ProductNormalizer {
  // Convert platform product → master product
  normalize(platformProduct: any, platform: Platform): MasterProduct
  
  // Convert master product → platform format
  denormalize(master: MasterProduct, platform: Platform): any
}

// Category mapping
model CategoryMapping {
  id          String @id
  userId      String
  masterCategory String  // Your internal category
  
  etsyTaxonomyId    Int?
  bcCategoryId      Int?
  shopifyCollection String?
  tiktokCategoryId  String?
}
```

---

### 4. **Two-Way Inventory Sync** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🔴 HIGH

**What's Missing:**
- No real-time inventory synchronization
- Cannot update inventory across platforms
- No conflict resolution for inventory changes

**ChatGPT Requirement:**
> "Global Inventory Sync: Each product has a master inventory; all channels mirror it. If an order is placed on Etsy, inventory instantly updates on BigCommerce."

**What's Needed:**
```typescript
model InventoryLevel {
  id                String   @id
  masterProductId   String
  variantId         String?  // Optional for multi-variant
  
  // Master inventory
  totalQuantity     Int
  allocated         Int      @default(0)
  available         Int      // Computed: total - allocated
  
  // Per-channel allocation
  channelAllocations Json    // { "ETSY": 5, "BC": 10 }
  
  // Safety stock
  lowStockThreshold Int      @default(5)
  
  masterProduct     MasterProduct @relation(...)
  
  updatedAt         DateTime @updatedAt
}

// Webhook handlers needed for:
// - Etsy order.created → reduce inventory
// - BigCommerce order.created → reduce inventory
// - Shopify order.created → reduce inventory
// - TikTok order.created → reduce inventory

// Sync engine needed:
class InventorySyncEngine {
  async syncInventoryToChannel(productId, storeId)
  async handleOrderCreated(orderId, platform)
  async resolveConflict(productId, channelInventories)
}
```

---

### 5. **Dynamic Pricing Rules** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🟡 MEDIUM

**What's Missing:**
- No per-channel pricing rules
- Cannot set markup percentages per platform
- No bulk price adjustment based on channel

**ChatGPT Requirement:**
> "Dynamic Pricing Rules: Channel-based markups (Etsy +10%, BigCommerce base price), Bulk price editor (raise or lower by %)"

**What's Needed:**
```typescript
model PricingRule {
  id              String   @id
  userId          String
  name            String   // "Etsy +10%", "BC Base Price"
  
  // Rule scope
  appliesTo       String   // "all", "specific_stores", "specific_products"
  storeIds        String[] // If specific_stores
  productIds      String[] // If specific_products
  
  // Rule logic
  ruleType        String   // "markup_percent", "markup_fixed", "set_price"
  value           Decimal  // The amount or percentage
  
  // Per-platform overrides
  platformRules   Json     // { "ETSY": { type: "markup_percent", value: 10 } }
  
  isActive        Boolean  @default(true)
  priority        Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Service layer
class PricingEngine {
  calculatePrice(masterProduct, targetPlatform): Decimal
  applyRules(product, rules): Decimal
  bulkUpdatePrices(productIds, ruleId)
}
```

---

### 6. **Variant Generator & Management** ❌
**Status:** PARTIALLY IMPLEMENTED  
**Priority:** 🔴 HIGH (for POD)

**What's Missing:**
- No automatic variant generation
- Cannot create color/size combinations automatically
- No variant-specific pricing or SKU generation

**ChatGPT Requirement:**
> "Variant Generator: Auto-generate color and size variants with pricing adjustments"

**Current Status:**
- Variants stored as JSON blobs
- No structured variant model
- No cross-platform variant mapping

**What's Needed:**
```typescript
model MasterVariant {
  id              String   @id
  masterProductId String
  
  // Option values
  optionValues    Json     // { "Color": "Red", "Size": "Large" }
  
  // Variant specifics
  sku             String
  price           Decimal?  // Override if different from base
  compareAtPrice  Decimal?
  
  // Inventory
  inventoryLevel  Int      @default(0)
  
  // Channel mappings
  channelVariants ChannelVariant[]
  
  masterProduct   MasterProduct @relation(...)
}

model ChannelVariant {
  id                String  @id
  masterVariantId   String
  channelListingId  String
  externalId        String  // Platform's variant ID
  
  // Platform-specific overrides
  platformSKU       String?
  platformPrice     Decimal?
  
  masterVariant     MasterVariant  @relation(...)
  channelListing    ChannelListing @relation(...)
}

// Variant generator UI
function VariantGenerator() {
  // Define options
  const colors = ["Red", "Blue", "Green"]
  const sizes = ["S", "M", "L", "XL"]
  
  // Auto-generate all combinations
  // Red-S, Red-M, Red-L, Red-XL, Blue-S, Blue-M, ...
  
  // Apply pricing rules per variant
  // sizes: { S: +0, M: +2, L: +4, XL: +6 }
}
```

---

### 7. **Product Templates (POD Specific)** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🟡 MEDIUM (but HIGH for POD focus)

**What's Missing:**
- No product templates
- No design library integration
- No mockup management

**ChatGPT Requirement:**
> "Product Templates: Default pricing, size charts, shipping profiles — ideal for POD T-shirt sellers"
> "Design Library Integration: Upload mockups, design files, and assign to listings"

**What's Needed:**
```typescript
model ProductTemplate {
  id          String @id
  userId      String
  name        String  // "Basic T-Shirt", "Premium Hoodie"
  category    String  // "apparel", "accessories"
  
  // Default settings
  basePrice   Decimal
  variants    Json    // Pre-defined color/size options
  
  // Design slots
  designSlots Json    // Where designs can be applied
  
  // Shipping
  weight      Decimal?
  dimensions  Json?   // { length, width, height }
  
  // Platform defaults
  defaultTags String[]
  defaultCategories Json  // Platform-specific
  
  isActive    Boolean @default(true)
  useCount    Int     @default(0)
  
  createdAt   DateTime @default(now())
}

model DesignLibrary {
  id          String @id
  userId      String
  name        String
  fileUrl     String  // S3/Cloud Storage URL
  thumbnail   String?
  fileType    String  // "png", "svg", "psd"
  
  // Metadata
  tags        String[]
  collections String[]
  
  // Usage tracking
  usedInProducts String[]  // Product IDs
  
  createdAt   DateTime @default(now())
}
```

---

### 8. **Smart Category Mapper** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🟡 MEDIUM

**What's Missing:**
- No automatic category detection
- No category suggestions
- Manual category mapping only

**ChatGPT Requirement:**
> "Smart Category Mapper: Detect product type ('T-shirt', 'Hoodie') and assign categories automatically"
> "AI Smart Mapper (optional): Suggests category mappings automatically"

**What's Needed:**
```typescript
class CategoryMapper {
  // Rule-based mapping
  detectProductType(productName: string, description: string): string
  
  // AI-based mapping (optional with OpenAI/Claude)
  async suggestCategories(product: MasterProduct): CategorySuggestion[]
  
  // Learning from user corrections
  async learnFromMapping(productId, userSelectedCategory)
}

// Category mapping rules
model CategoryRule {
  id        String @id
  userId    String
  pattern   String  // Regex or keyword
  
  etsyTaxonomyId    Int?
  bcCategoryId      Int?
  shopifyCollection String?
  
  confidence        Int  // 0-100
  timesUsed         Int  @default(0)
}
```

---

### 9. **Order Synchronization** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🟡 MEDIUM (Future)

**What's Missing:**
- No order management
- No fulfillment tracking
- No cross-platform order sync

**ChatGPT Requirement:**
> "Order Synchronization: Pulling orders from each platform, Syncing fulfillment status and tracking numbers"

**What's Needed:**
```typescript
model Order {
  id                String   @id
  userId            String
  storeConnectionId String
  platform          Platform
  externalOrderId   String
  
  // Order info
  orderNumber       String
  customerEmail     String?
  totalAmount       Decimal
  currency          String
  
  // Items
  items             OrderItem[]
  
  // Status
  fulfillmentStatus String  // "unfulfilled", "fulfilled", "cancelled"
  paymentStatus     String
  
  // Timestamps
  placedAt          DateTime
  fulfilledAt       DateTime?
  
  storeConnection   StoreConnection @relation(...)
}

model OrderItem {
  id                String  @id
  orderId           String
  masterProductId   String?
  variantId         String?
  
  productName       String
  sku               String?
  quantity          Int
  price             Decimal
  
  order             Order          @relation(...)
  masterProduct     MasterProduct? @relation(...)
}

// Webhook handlers for order.created on each platform
```

---

### 10. **Sync Engine with Conflict Resolution** ❌
**Status:** BASIC IMPLEMENTATION  
**Priority:** 🔴 HIGH

**What's Missing:**
- No conflict resolution when platform data differs from master
- No delta sync (always full sync)
- No change tracking

**ChatGPT Requirement:**
> "Conflict Resolution: per-store policy: 'Channel wins' vs 'Hub wins', with visual diff"
> "Delta checks: Use platform timestamps to avoid full pulls"

**What's Needed:**
```typescript
model ChangeLog {
  id              String   @id
  userId          String
  entityType      String   // "product", "inventory", "price"
  entityId        String
  
  field           String
  oldValue        Json?
  newValue        Json
  
  source          String   // "user", "platform_sync", "webhook"
  platform        Platform?
  
  createdAt       DateTime @default(now())
}

class SyncEngine {
  // Detect changes since last sync
  async detectChanges(storeId, lastSyncTime): ChangeSet
  
  // Resolve conflicts
  async resolveConflict(
    masterData: any,
    platformData: any,
    strategy: "master_wins" | "platform_wins" | "manual"
  ): ResolvedData
  
  // Apply changes
  async applyChanges(changes: ChangeSet, direction: "push" | "pull")
}
```

---

### 11. **Webhook Management** ❌
**Status:** NOT IMPLEMENTED  
**Priority:** 🔴 HIGH

**What's Missing:**
- No webhook receivers for real-time updates
- No webhook registration with platforms
- No event processing queue

**ChatGPT Requirement:**
> "Subscribe to webhooks (Etsy listing updated; BigCommerce product updated)"
> "On webhook → enqueue job → upsert into your DB"

**What's Needed:**
```typescript
// Webhook endpoints needed:
// POST /api/webhooks/bigcommerce
// POST /api/webhooks/shopify
// POST /api/webhooks/etsy
// POST /api/webhooks/tiktok

model WebhookEvent {
  id          String   @id
  platform    Platform
  eventType   String   // "product.updated", "order.created"
  payload     Json
  
  processed   Boolean  @default(false)
  processedAt DateTime?
  error       String?
  
  receivedAt  DateTime @default(now())
  
  @@index([platform, processed])
  @@index([receivedAt])
}

// Job queue for webhook processing
class WebhookProcessor {
  async registerWebhooks(storeId)
  async handleWebhook(platform, eventType, payload)
  async processQueue()
}
```

---

### 12. **Bulk Operations Enhancement** ⚠️
**Status:** BASIC IMPLEMENTATION  
**Priority:** 🟡 MEDIUM

**Current:**
- Can bulk edit prices and tags
- Can bulk delete products
- Operations are synchronous (slow for large batches)

**What's Missing:**
- No background job processing for large batches
- No progress tracking for bulk operations
- Cannot bulk publish to channels

**What's Needed:**
```typescript
// Already have BulkOperation model ✅
// Need to enhance with:
- Better progress tracking
- Resume capability on failure
- Chunk processing for large datasets
- Notification on completion

// New operations needed:
- Bulk publish to channels
- Bulk unpublish
- Bulk inventory update
- Bulk apply template
```

---

## 📊 Feature Comparison Matrix

| Feature | Current Status | Required for POD | Priority |
|---------|---------------|------------------|----------|
| **Store Connections** | ✅ Implemented | ✅ Yes | - |
| **Import Products (Pull)** | ✅ Implemented | ✅ Yes | - |
| **Product Listing UI** | ✅ Implemented | ✅ Yes | - |
| **Basic Search/Filter** | ✅ Implemented | ✅ Yes | - |
| **Bulk Operations** | ⚠️ Basic | ✅ Yes | 🟡 Medium |
| **Centralized Product Creation** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Cross-Channel Publishing** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Data Normalization** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Two-Way Inventory Sync** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Variant Generator** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Sync Engine (Bidirectional)** | ⚠️ Pull Only | ✅ Yes | 🔴 **CRITICAL** |
| **Webhook Management** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |
| **Dynamic Pricing Rules** | ❌ Missing | ✅ Yes | 🟡 Medium |
| **Product Templates** | ❌ Missing | ✅ Yes (POD) | 🟡 Medium |
| **Design Library** | ❌ Missing | ⚠️ Nice to Have | 🟢 Low |
| **Smart Category Mapper** | ❌ Missing | ⚠️ Nice to Have | 🟢 Low |
| **Order Management** | ❌ Missing | ⚠️ Future | 🟢 Low |
| **Conflict Resolution** | ❌ Missing | ✅ Yes | 🔴 **CRITICAL** |

---

## 🗄️ Database Architecture Needed

### Current Schema Issues
1. **No master product concept** - all products are platform-specific
2. **No variant relationships** - variants stored as JSON
3. **No channel listing concept** - cannot publish one product to many channels
4. **No inventory tracking** - just static product data
5. **No change tracking** - no audit trail for edits

### Proposed Schema Additions

```prisma
// 1. Master Products (your source of truth)
model MasterProduct {
  id                String   @id @default(cuid())
  userId            String
  
  // Core fields
  title             String
  description       String?  @db.Text
  baseSKU           String
  basePrice         Decimal  @db.Decimal(10, 2)
  compareAtPrice    Decimal? @db.Decimal(10, 2)
  
  // Classification
  category          String?
  tags              String[]
  
  // Design & Template
  templateId        String?
  designIds         String[] // References to DesignLibrary
  
  // Media
  images            Json?    // Array of image URLs
  
  // Variants
  variants          MasterVariant[]
  
  // Channel listings
  channelListings   ChannelListing[]
  
  // Inventory
  inventoryLevels   InventoryLevel[]
  
  // Status
  status            ProductStatus @default(DRAFT)
  
  user              User @relation(...)
  template          ProductTemplate? @relation(...)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([userId, status])
  @@index([baseSKU])
}

// 2. Channel Listings (platform-specific instances)
model ChannelListing {
  id                String   @id @default(cuid())
  masterProductId   String
  storeConnectionId String
  platform          Platform
  externalId        String?  // ID on the platform
  
  // Platform-specific overrides
  titleOverride     String?
  descriptionOverride String? @db.Text
  priceOverride     Decimal? @db.Decimal(10, 2)
  
  // Platform metadata
  platformCategories String[]
  platformTags      String[]
  platformData      Json?    // Platform-specific fields
  
  // Publishing
  publishStatus     String   @default("draft")  // draft, published, failed
  publishError      String?  @db.Text
  lastPushedAt      DateTime?
  lastPulledAt      DateTime?
  
  // Variants
  channelVariants   ChannelVariant[]
  
  masterProduct     MasterProduct   @relation(...)
  storeConnection   StoreConnection @relation(...)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([storeConnectionId, externalId])
  @@index([masterProductId])
  @@index([publishStatus])
}

// 3. Master Variants
model MasterVariant {
  id              String   @id @default(cuid())
  masterProductId String
  
  // Variant definition
  optionValues    Json     // { "Color": "Red", "Size": "Large" }
  
  // Variant specifics
  sku             String   @unique
  price           Decimal? @db.Decimal(10, 2)  // Override if needed
  compareAtPrice  Decimal? @db.Decimal(10, 2)
  
  // Images
  imageOverrides  String[] // Specific images for this variant
  
  // Inventory
  inventoryLevel  InventoryLevel?
  
  // Channel mappings
  channelVariants ChannelVariant[]
  
  masterProduct   MasterProduct @relation(...)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([masterProductId])
}

// 4. Channel Variants (platform-specific variants)
model ChannelVariant {
  id                String  @id @default(cuid())
  masterVariantId   String
  channelListingId  String
  externalId        String  // Platform's variant ID
  
  // Platform-specific overrides
  platformSKU       String?
  platformPrice     Decimal? @db.Decimal(10, 2)
  platformData      Json?
  
  masterVariant     MasterVariant  @relation(...)
  channelListing    ChannelListing @relation(...)
  
  @@unique([channelListingId, externalId])
  @@index([masterVariantId])
}

// 5. Inventory Management
model InventoryLevel {
  id                String   @id @default(cuid())
  masterProductId   String?  // For simple products
  masterVariantId   String?  // For variants
  
  // Master inventory
  totalQuantity     Int      @default(0)
  allocated         Int      @default(0)  // Reserved for orders
  available         Int      // Computed: total - allocated
  
  // Per-channel allocation
  channelAllocations Json?   // { "storeId1": 10, "storeId2": 5 }
  
  // Safety stock
  lowStockThreshold Int      @default(5)
  safetyStock       Int      @default(0)
  
  // Status
  trackInventory    Boolean  @default(true)
  allowBackorder    Boolean  @default(false)
  
  masterProduct     MasterProduct? @relation(...)
  masterVariant     MasterVariant? @relation(...)
  
  updatedAt         DateTime @updatedAt
  
  @@unique([masterProductId])
  @@unique([masterVariantId])
}

// 6. Pricing Rules
model PricingRule {
  id              String   @id @default(cuid())
  userId          String
  name            String
  description     String?
  
  // Rule scope
  appliesTo       String   // "all", "specific_stores", "specific_products"
  storeIds        String[]
  productIds      String[]
  tags            String[] // Apply to products with these tags
  
  // Rule logic
  ruleType        String   // "markup_percent", "markup_fixed", "set_price"
  value           Decimal  @db.Decimal(10, 2)
  
  // Platform-specific overrides
  platformRules   Json?    // { "ETSY": { type: "markup_percent", value: 10 } }
  
  // Status
  isActive        Boolean  @default(true)
  priority        Int      @default(0)  // Higher = applied first
  
  user            User @relation(...)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId, isActive])
}

// 7. Product Templates (for POD)
model ProductTemplate {
  id              String   @id @default(cuid())
  userId          String
  name            String
  description     String?
  category        String?  // "apparel", "accessories", etc.
  
  // Default settings
  basePrice       Decimal  @db.Decimal(10, 2)
  priceBySize     Json?    // { "S": 0, "M": 2, "L": 4, "XL": 6 }
  
  // Variant options
  variantOptions  Json     // { "Color": [...], "Size": [...] }
  
  // Design placeholders
  designSlots     Json?    // Where designs can be placed
  
  // Shipping
  weight          Decimal? @db.Decimal(10, 2)
  dimensions      Json?    // { length, width, height }
  
  // Platform defaults
  defaultTags     String[]
  defaultCategories Json?  // Platform-specific
  
  // Usage
  isActive        Boolean  @default(true)
  useCount        Int      @default(0)
  
  user            User @relation(...)
  products        MasterProduct[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId, isActive])
}

// 8. Design Library (for POD)
model DesignLibrary {
  id              String   @id @default(cuid())
  userId          String
  name            String
  description     String?
  
  // File info
  fileUrl         String   // S3/Cloud Storage
  thumbnailUrl    String?
  fileType        String   // "png", "svg", "psd", "ai"
  fileSize        Int?     // bytes
  
  // Metadata
  tags            String[]
  collections     String[]
  
  // Usage
  usedInProducts  String[] // MasterProduct IDs
  
  user            User @relation(...)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
}

// 9. Category Mappings
model CategoryMapping {
  id              String   @id @default(cuid())
  userId          String
  name            String   // User's category name
  
  // Platform-specific IDs
  etsyTaxonomyId  Int?
  bcCategoryId    Int?
  shopifyCollection String?
  tiktokCategoryId String?
  
  // Auto-mapping rules
  keywords        String[] // Keywords to auto-detect
  pattern         String?  // Regex pattern
  
  // Stats
  timesUsed       Int      @default(0)
  
  user            User @relation(...)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
}

// 10. Change Log (audit trail)
model ChangeLog {
  id              String   @id @default(cuid())
  userId          String
  entityType      String   // "product", "variant", "inventory", "price"
  entityId        String
  
  // Change details
  field           String
  oldValue        Json?
  newValue        Json?
  
  // Source tracking
  source          String   // "user", "sync", "webhook", "bulk_op"
  sourceId        String?  // Bulk operation ID, sync job ID, etc.
  platform        Platform?
  
  user            User @relation(...)
  
  createdAt       DateTime @default(now())
  
  @@index([userId, entityType, entityId])
  @@index([createdAt])
}

// 11. Webhook Events
model WebhookEvent {
  id              String   @id @default(cuid())
  storeConnectionId String?
  platform        Platform
  eventType       String   // "product.updated", "inventory.updated", "order.created"
  
  // Payload
  payload         Json
  signature       String?  // For verification
  
  // Processing
  processed       Boolean  @default(false)
  processedAt     DateTime?
  processingError String?  @db.Text
  retryCount      Int      @default(0)
  
  storeConnection StoreConnection? @relation(...)
  
  receivedAt      DateTime @default(now())
  
  @@index([platform, processed])
  @@index([receivedAt])
}

// Update existing Product model to reference MasterProduct
model Product {
  // ... existing fields ...
  
  // Add reference to master product (if this is a synced product)
  masterProductId String?
  channelListingId String?
  
  masterProduct    MasterProduct?   @relation(...)
  channelListing   ChannelListing?  @relation(...)
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2) 🔴 CRITICAL
**Goal:** Enable basic centralized product creation

1. **Database Migration**
   - Add `MasterProduct`, `ChannelListing`, `MasterVariant` models
   - Migrate existing products to new structure (keep legacy for compatibility)
   - Add indexes for performance

2. **Master Product CRUD**
   - Create product form (title, description, SKU, price, images)
   - Simple variant input (manual entry)
   - Save to database

3. **Basic Push to Channels**
   - Implement BigCommerce product creation API
   - Implement Shopify product creation API
   - Create `ChannelListing` records on successful publish

**Deliverable:** Can create a product once, publish to BC & Shopify

---

### Phase 2: Data Normalization (Week 3) 🔴 CRITICAL
**Goal:** Bidirectional sync with field mapping

1. **Data Normalizer Service**
   - Platform → Master converter
   - Master → Platform converter
   - Field mapping configuration

2. **Category Mapper**
   - Basic category mapping table
   - Manual category assignment
   - Category translation per platform

3. **Enhanced Import**
   - Import now creates `MasterProduct` + `ChannelListing`
   - Preserve link between master and channel
   - Detect duplicates across platforms

**Deliverable:** Products stay in sync when edited on platform or in your app

---

### Phase 3: Variant Management (Week 4) 🔴 CRITICAL
**Goal:** Full variant support with auto-generation

1. **Variant Generator UI**
   - Define color/size options
   - Auto-generate all combinations
   - Pricing rules per option

2. **Variant Sync**
   - Create variants on all platforms
   - Map platform variants to master variants
   - Sync variant changes bidirectionally

3. **Variant Images**
   - Assign images to specific variants
   - Image mapping per platform

**Deliverable:** Create one product with 20 variants, publish to all channels automatically

---

### Phase 4: Inventory Sync (Week 5) 🔴 CRITICAL
**Goal:** Real-time inventory across channels

1. **Inventory Management**
   - Add `InventoryLevel` tracking
   - Per-channel allocation
   - Low stock alerts

2. **Webhook Setup**
   - Register webhooks with platforms
   - Handle inventory change events
   - Update master inventory

3. **Inventory Sync Engine**
   - Push inventory changes to channels
   - Pull inventory changes from platforms
   - Conflict resolution

**Deliverable:** Sell on Etsy, inventory updates on BigCommerce instantly

---

### Phase 5: Smart Features (Week 6-7) 🟡 MEDIUM
**Goal:** Automation and optimization

1. **Pricing Rules Engine**
   - Define per-channel markup rules
   - Automatic price calculation
   - Bulk price updates

2. **Product Templates**
   - Create reusable templates
   - Template-based product creation
   - Pre-filled defaults

3. **Category Mapper**
   - Auto-detect product type
   - Suggest categories
   - Learning system

**Deliverable:** Create 100 products in minutes using templates

---

### Phase 6: Polish & Scale (Week 8) 🟢 LOW PRIORITY
**Goal:** Production-ready system

1. **Enhanced Bulk Operations**
   - Background job processing
   - Better progress tracking
   - Bulk publish to channels

2. **Design Library**
   - Upload designs/mockups
   - Assign to products
   - Design versioning

3. **Analytics & Reporting**
   - Sales by channel
   - Inventory turnover
   - Sync health metrics

**Deliverable:** Production-ready POD platform

---

## 💾 Storage Strategy

### Database (PostgreSQL)
**Store in DB:**
- Master products and variants
- Channel listings and mappings
- Inventory levels
- Pricing rules and templates
- User data, subscriptions
- Sync jobs and change logs

### JSON Storage (within DB)
**What to store as JSON:**
- Platform-specific metadata
- Variant option combinations
- Image arrays
- Custom fields
- Platform-specific overrides

### Cache (Optional - Redis)
**What to cache:**
- Product counts per user
- Subscription status
- Active pricing rules
- Frequently accessed products

### File Storage (S3/Cloudflare R2)
**What to store externally:**
- Product images
- Design files
- Mockups
- User uploads
- Generated reports

---

## 🔄 Sync Strategy Recommendation

### Hybrid Approach (Best for POD)

1. **Master-First (Write-Through)**
   - User creates/edits in your app
   - Write to `MasterProduct` first
   - Queue jobs to push to each channel
   - Store `ChannelListing` records with external IDs

2. **Webhook-Driven (Read-Back)**
   - Register webhooks with all platforms
   - Receive updates when products change on platform
   - Update `ChannelListing` data
   - Optionally update `MasterProduct` based on conflict rules

3. **Periodic Reconciliation**
   - Daily background job to detect drift
   - Compare master vs channel data
   - Alert user to conflicts
   - Auto-resolve based on rules

4. **Delta Sync**
   - Use platform timestamps for incremental updates
   - Only fetch changes since last sync
   - Faster and more efficient

---

## 🎯 Quick Wins (Week 1)

If you want to show immediate progress, start with these:

### 1. **Basic Master Product Creation** (2 days)
- Add `MasterProduct` table
- Simple create form
- Save product with variants as JSON initially

### 2. **BigCommerce Publisher** (2 days)
- Implement product creation API call
- Handle success/failure
- Store external ID

### 3. **Channel Listing Records** (1 day)
- Link master product to BC product
- Store publish status
- Show in UI which channels product is on

**Result:** Can create one product, publish to BigCommerce, see it linked

---

## 📋 Immediate Next Steps

1. **Review this analysis** - Confirm priorities align with your goals
2. **Choose starting phase** - Recommend Phase 1 (Foundation)
3. **Approve database schema** - Review proposed models
4. **Switch to Code mode** - Begin implementation

---

## 🤔 Key Questions for You

1. **Priorities:** Do you want to focus on ALL features or just POD-specific ones first?
2. **Platforms:** Which platform should we implement publishing to first? (Recommend BigCommerce as you already have API experience)
3. **Inventory:** Do you need real-time inventory sync immediately, or can that wait?
4. **Variants:** How complex do your variants need to be? (Color/Size only, or more options?)
5. **Templates:** Is template functionality critical for your use case?
6. **Timeline:** What's your deadline? This will help prioritize.

---

## 📊 Summary: Current vs. Target State

| Capability | Current | Target | Gap |
|------------|---------|--------|-----|
| **Data Flow** | One-way (Import) | Bidirectional | 50% |
| **Product Model** | Platform-specific | Normalized Master + Channels | 0% |
| **Publishing** | None | All platforms | 0% |
| **Inventory** | Static | Real-time sync | 0% |
| **Variants** | JSON blob | Structured + Generated | 0% |
| **Pricing** | Static | Rule-based | 0% |
| **Automation** | Manual | Template-driven | 0% |
| **Webhooks** | None | All platforms | 0% |

**Overall Completion: ~30%** (basic infrastructure exists, core features missing)

---

Ready to discuss priorities and create an implementation plan? Let me know your thoughts on:
1. Which features are must-haves vs. nice-to-haves
2. Which platform to start publishing to first
3. Timeline expectations

Then we can switch to Code mode and start building! 🚀