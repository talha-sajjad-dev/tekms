# API Endpoints Specification - Full Sync System

## 📡 BigCommerce API Endpoints to Use

### Product Data Endpoints

#### 1. Products (Base)
```
GET /v3/catalog/products?include=images,variants,custom_fields&limit=250&page={page}
```
**Returns**: Basic product info, images, variants, custom fields

#### 2. Product Modifiers
```
GET /v3/catalog/products/{product_id}/modifiers
```
**Returns**: All modifiers (dropdowns, text fields, checkboxes, etc.)

#### 3. Product Options
```
GET /v3/catalog/products/{product_id}/options
```
**Returns**: Option sets (Color, Size, etc.) with values

#### 4. Product Variants (Detailed)
```
GET /v3/catalog/products/{product_id}/variants
```
**Returns**: Full variant details with SKU, price, inventory, weight, images

#### 5. Product Images
```
GET /v3/catalog/products/{product_id}/images
```
**Returns**: All product images with metadata

#### 6. Product Videos
```
GET /v3/catalog/products/{product_id}/videos
```
**Returns**: Product videos

#### 7. Product Bulk Pricing Rules
```
GET /v3/catalog/products/{product_id}/bulk-pricing-rules
```
**Returns**: Quantity-based pricing

#### 8. Product Complex Rules
```
GET /v3/catalog/products/{product_id}/complex-rules
```
**Returns**: Advanced product rules

#### 9. Product Metafields
```
GET /v3/catalog/products/{product_id}/metafields
```
**Returns**: Additional metadata

#### 10. Categories
```
GET /v3/catalog/categories
GET /v3/catalog/categories/{category_id}
```
**Returns**: Category tree and details

#### 11. Brands
```
GET /v3/catalog/brands
```
**Returns**: Brand information

#### 12. Product Reviews
```
GET /v3/catalog/products/{product_id}/reviews
```
**Returns**: Product ratings and reviews

---

## 🔄 Our API Endpoints

### Sync Management

#### Start Full Sync
```typescript
POST /api/stores/{storeId}/sync/full

Request Body:
{
  background: boolean,
  stages?: string[], // Optional: specific stages to sync
  options?: {
    fetchImages: boolean,
    fetchVariants: boolean,
    fetchModifiers: boolean,
    fetchCustomFields: boolean,
    fetchSEO: boolean,
    fetchInventory: boolean,
    fetchReviews: boolean
  }
}

Response:
{
  success: true,
  jobId: string,
  background: boolean,
  stages: {
    name: string,
    estimatedItems: number
  }[]
}
```

#### Get Sync Progress
```typescript
GET /api/stores/{storeId}/sync-status?jobId={jobId}

Response:
{
  jobId: string,
  status: 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled',
  
  // Overall progress
  totalItems: number,
  processedItems: number,
  failedItems: number,
  progress: number, // 0-100
  
  // Stage tracking
  currentStage: {
    name: string,
    status: string,
    itemsProcessed: number,
    totalItems: number,
    progress: number
  },
  
  stages: {
    name: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    itemsProcessed: number,
    totalItems: number,
    startedAt?: string,
    completedAt?: string,
    errors?: string[]
  }[],
  
  // Timing
  startedAt: string,
  estimatedTimeRemaining?: number, // seconds
  
  // Control
  canPause: boolean,
  canCancel: boolean,
  isPaused: boolean,
  
  // Results
  results?: {
    products: number,
    variants: number,
    modifiers: number,
    images: number,
    failed: number
  },
  
  // Errors
  errors?: {
    stage: string,
    count: number,
    samples: string[]
  }[]
}
```

#### Pause Sync
```typescript
POST /api/stores/{storeId}/sync/pause

Request Body:
{
  jobId: string
}

Response:
{
  success: true,
  message: string,
  pausedAt: string
}
```

#### Resume Sync
```typescript
POST /api/stores/{storeId}/sync/resume

Request Body:
{
  jobId: string
}

Response:
{
  success: true,
  message: string,
  resumedAt: string
}
```

#### Cancel Sync
```typescript
POST /api/stores/{storeId}/sync/cancel

Request Body:
{
  jobId?: string,
  reason?: string
}

Response:
{
  success: true,
  message: string,
  clearedCount: number
}
```

### Product Data Endpoints

#### Get Product with Full Data
```typescript
GET /api/products/{productId}/full

Response:
{
  id: string,
  
  // Basic info
  name: string,
  description: string,
  sku: string,
  price: number,
  
  // Variants
  variants: {
    id: string,
    sku: string,
    price: number,
    inventoryLevel: number,
    optionValues: { [key: string]: string },
    images: string[]
  }[],
  
  // Modifiers
  modifiers: {
    id: string,
    name: string,
    type: string,
    required: boolean,
    values?: { label: string, value: string, priceAdjustment?: number }[]
  }[],
  
  // Options
  options: {
    id: string,
    name: string,
    displayName: string,
    type: string,
    values: { label: string, value: string }[]
  }[],
  
  // Images
  images: {
    id: string,
    url: string,
    thumbnailUrl: string,
    altText: string,
    sortOrder: number,
    variantIds?: string[]
  }[],
  
  // Videos
  videos: {
    id: string,
    title: string,
    url: string,
    thumbnailUrl: string
  }[],
  
  // Custom fields
  customFields: {
    name: string,
    value: string
  }[],
  
  // SEO
  seo: {
    metaTitle: string,
    metaDescription: string,
    searchKeywords: string[],
    urlSlug: string
  },
  
  // Inventory
  inventory: {
    tracking: string,
    level: number,
    warningLevel: number,
    locations?: {
      locationId: string,
      quantity: number
    }[]
  },
  
  // Shipping
  shipping: {
    weight: number,
    weightUnit: string,
    dimensions: {
      width: number,
      height: number,
      depth: number,
      unit: string
    },
    fixedCost?: number,
    freeShipping: boolean
  },
  
  // Categories
  categories: {
    id: string,
    name: string,
    breadcrumbs: string[]
  }[],
  
  // Bulk pricing
  bulkPricing: {
    minQuantity: number,
    maxQuantity?: number,
    price: number,
    type: string
  }[],
  
  // Reviews
  reviews: {
    rating: number,
    count: number
  },
  
  // Platform data
  platform: string,
  externalId: string,
  platformData: any
}
```

#### Update Product (Full)
```typescript
PATCH /api/products/{productId}/full

Request Body: (Same structure as GET response, partial updates allowed)

Response:
{
  success: true,
  updated: {
    basic: boolean,
    variants: number,
    modifiers: number,
    images: number,
    seo: boolean,
    inventory: boolean,
    shipping: boolean
  }
}
```

### Cross-Listing Endpoints

#### Create Cross-Listing
```typescript
POST /api/cross-listings

Request Body:
{
  sourceProductId: string,
  targetStoreId: string,
  
  // Field mappings
  titleTemplate?: string, // e.g., "{name} - Premium Quality"
  descriptionTemplate?: string,
  
  // Price adjustment
  priceAdjustment?: {
    type: 'markup_percent' | 'markup_fixed' | 'set_price',
    value: number
  },
  
  // Category mapping
  categoryMapping?: {
    platformCategoryId: string,
    platformCategoryPath: string[]
  },
  
  // Tag mapping
  tags?: string[],
  
  // Options
  includeVariants: boolean,
  includeImages: boolean,
  includeCustomFields: boolean,
  
  // Auto-publish
  autoPublish: boolean
}

Response:
{
  success: true,
  crossListingId: string,
  status: 'draft' | 'ready' | 'published',
  previewUrl?: string
}
```

#### Get Cross-Listing Preview
```typescript
GET /api/cross-listings/{crossListingId}/preview

Response:
{
  // Shows how product will appear on target platform
  targetPlatform: string,
  previewData: {
    title: string,
    description: string,
    price: number,
    images: string[],
    variants: any[],
    // ... platform-specific fields
  },
  
  // Validation
  validation: {
    valid: boolean,
    errors: string[],
    warnings: string[]
  }
}
```

#### Publish Cross-Listing
```typescript
POST /api/cross-listings/{crossListingId}/publish

Response:
{
  success: true,
  externalId: string, // ID on target platform
  publishedUrl: string,
  publishedAt: string
}
```

---

## 🔧 Implementation Details

### Rate Limiting Middleware

```typescript
// lib/rate-limiter.ts
export async function checkRateLimit(
  userId: string,
  storeId: string,
  operation: string
): Promise<{ allowed: boolean; waitTime?: number }> {
  // Get subscription tier
  const subscription = await getStoreSubscription(storeId)
  const limits = getRateLimits(subscription.pricingTierId)
  
  // Check current usage
  const usage = await getUsage(userId, storeId)
  
  if (usage.requestsThisMinute >= limits.requestsPerMinute) {
    return {
      allowed: false,
      waitTime: calculateWaitTime(usage, limits)
    }
  }
  
  // Increment usage
  await incrementUsage(userId, storeId, operation)
  
  return { allowed: true }
}
```

### Sync Queue Worker

```typescript
// lib/sync-queue-worker.ts
export async function processSyncJob(jobId: string) {
  const job = await getSyncJob(jobId)
  
  // Check for cancellation
  if (job.cancelRequested) {
    await cancelJob(jobId)
    return
  }
  
  // Check for pause
  if (job.isPaused) {
    await pauseJob(jobId)
    return
  }
  
  // Process next stage
  const nextStage = getNextStage(job)
  
  if (!nextStage) {
    await completeJob(jobId)
    return
  }
  
  // Update current stage
  await updateJobStage(jobId, nextStage)
  
  // Fetch data with rate limiting
  const data = await fetchStageDataWithRateLimit(job, nextStage)
  
  // Process and save
  await processStageData(job, nextStage, data)
  
  // Queue next stage
  await queueNextStage(jobId)
}
```

### Data Normalizer

```typescript
// lib/data-normalizer.ts
export function normalizeProductData(
  platformData: any,
  platform: Platform
): NormalizedProduct {
  switch (platform) {
    case 'BIGCOMMERCE':
      return normalizeBigCommerceProduct(platformData)
    case 'SHOPIFY':
      return normalizeShopifyProduct(platformData)
    case 'ETSY':
      return normalizeEtsyProduct(platformData)
    case 'TIKTOK':
      return normalizeTikTokProduct(platformData)
  }
}

function normalizeBigCommerceProduct(data: any): NormalizedProduct {
  return {
    basic: {
      name: data.name,
      description: data.description,
      sku: data.sku,
      price: data.price,
      compareAtPrice: data.retail_price,
      weight: data.weight,
      condition: data.condition,
      availability: data.availability
    },
    
    variants: data.variants?.map(v => ({
      id: v.id.toString(),
      sku: v.sku,
      price: v.price,
      inventoryLevel: v.inventory_level,
      optionValues: v.option_values,
      weight: v.weight,
      images: v.image_url ? [v.image_url] : []
    })) || [],
    
    modifiers: data.modifiers?.map(m => ({
      id: m.id.toString(),
      name: m.name,
      displayName: m.display_name,
      type: m.type,
      required: m.required,
      values: m.option_values
    })) || [],
    
    // ... normalize all other fields
  }
}
```

---

## 🎯 Next Steps

1. **Create API routes** in `app/api/stores/[id]/sync/full/route.ts`
2. **Implement sync stages** in `lib/sync/stages/`
3. **Build queue system** using Bull or similar
4. **Create normalizers** for each platform
5. **Build UI components** for progress tracking
6. **Add pause/cancel logic** to queue workers
7. **Implement rate limiting** middleware
8. **Create advanced edit UI** with tabs
9. **Build cross-listing workflow**
10. **Add comprehensive testing**
