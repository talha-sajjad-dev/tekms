# Implementation Guide - Full Sync System

## 🚀 Quick Start

This guide provides step-by-step implementation instructions for the full sync and cross-listing system.

---

## Phase 1: Database Schema Updates

### Step 1: Create Migration File

```bash
npx prisma migrate dev --name add_full_sync_tables
```

### Step 2: Add New Models to schema.prisma

Add these models to your `prisma/schema.prisma`:

```prisma
// Enhanced sync job tracking
model SyncJob {
  // ... existing fields ...
  
  // Enhanced tracking
  stages              Json?     // Array of stage objects
  currentStage        String?
  isPaused            Boolean   @default(false)
  cancelRequested     Boolean   @default(false)
  cancellationReason  String?
  estimatedTimeRemaining Int?   // seconds
}

// Product variants (detailed)
model ProductVariant {
  id                String   @id @default(cuid())
  productId         String
  platform          Platform
  externalId        String
  
  sku               String?
  name              String?
  price             Decimal  @db.Decimal(10, 2)
  compareAtPrice    Decimal? @db.Decimal(10, 2)
  costPrice         Decimal? @db.Decimal(10, 2)
  
  inventoryLevel    Int      @default(0)
  inventoryTracking Boolean  @default(true)
  weight            Decimal? @db.Decimal(10, 2)
  weightUnit        String?
  
  optionValues      Json     // { "Color": "Red", "Size": "Large" }
  images            Json?
  dimensions        Json?
  
  platformData      Json?
  
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([productId, platform, externalId])
  @@index([productId])
  @@index([sku])
}

// Product modifiers
model ProductModifier {
  id                String   @id @default(cuid())
  productId         String
  platform          Platform
  externalId        String
  
  name              String
  displayName       String
  type              String   // dropdown, text, checkbox, file, etc.
  required          Boolean  @default(false)
  
  values            Json?    // For dropdown/radio options
  validation        Json?    // Min/max, regex, etc.
  
  platformData      Json?
  
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([productId, platform, externalId])
  @@index([productId])
}

// Product options
model ProductOption {
  id                String   @id @default(cuid())
  productId         String
  platform          Platform
  externalId        String
  
  name              String
  displayName       String
  type              String
  
  values            Json
  
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([productId, platform, externalId])
  @@index([productId])
}

// SEO data
model ProductSEO {
  id                String   @id @default(cuid())
  productId         String   @unique
  
  metaTitle         String?
  metaDescription   String?  @db.Text
  searchKeywords    String[]
  urlSlug           String?
  
  platformSEO       Json?
  
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  updatedAt         DateTime @updatedAt
  createdAt         DateTime @default(now())
}

// Shipping data
model ProductShipping {
  id                String   @id @default(cuid())
  productId         String   @unique
  
  weight            Decimal? @db.Decimal(10, 2)
  weightUnit        String?
  
  width             Decimal? @db.Decimal(10, 2)
  height            Decimal? @db.Decimal(10, 2)
  depth             Decimal? @db.Decimal(10, 2)
  dimensionUnit     String?
  
  fixedCost         Decimal? @db.Decimal(10, 2)
  freeShipping      Boolean  @default(false)
  
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  updatedAt         DateTime @updatedAt
  createdAt         DateTime @default(now())
}

// Cross-listing
model CrossListing {
  id                String   @id @default(cuid())
  sourceProductId   String
  targetStoreId     String
  targetPlatform    Platform
  
  status            String   @default("draft")
  
  titleTemplate     String?
  descriptionTemplate String? @db.Text
  priceAdjustment   Json?
  categoryMapping   Json?
  tagMapping        Json?
  
  externalId        String?
  publishedAt       DateTime?
  publishError      String?  @db.Text
  
  sourceProduct     Product  @relation(fields: [sourceProductId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([sourceProductId, targetStoreId])
  @@index([status])
}
```

### Step 3: Update Product Model

Add these relations to the existing Product model:

```prisma
model Product {
  // ... existing fields ...
  
  // New relations
  variants          ProductVariant[]
  modifiers         ProductModifier[]
  options           ProductOption[]
  seo               ProductSEO?
  shipping          ProductShipping?
  crossListings     CrossListing[]
}
```

### Step 4: Run Migration

```bash
npx prisma generate
npx prisma db push
```

---

## Phase 2: Enhanced Sync Engine

### Step 1: Create Sync Service

Create `lib/sync/full-sync-service.ts`:

```typescript
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { rateLimitedFetch } from '@/lib/bigcommerce/rate-limiter'

interface SyncStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed: number
  totalItems: number
  startedAt?: Date
  completedAt?: Date
  errors?: string[]
}

export class FullSyncService {
  private jobId: string
  private store: any
  private accessToken: string
  private stages: SyncStage[] = []
  
  constructor(jobId: string, store: any) {
    this.jobId = jobId
    this.store = store
    this.accessToken = decrypt(store.accessToken)
  }
  
  async execute() {
    await this.initializeStages()
    
    for (const stageName of this.getStageNames()) {
      // Check for cancellation
      if (await this.isCancelled()) {
        await this.markAsCancelled()
        return
      }
      
      // Check for pause
      if (await this.isPaused()) {
        await this.waitForResume()
      }
      
      await this.executeStage(stageName)
    }
    
    await this.complete()
  }
  
  private getStageNames(): string[] {
    return [
      'products',
      'variants',
      'modifiers',
      'options',
      'images',
      'seo',
      'inventory',
      'shipping'
    ]
  }
  
  private async initializeStages() {
    this.stages = this.getStageNames().map(name => ({
      name,
      status: 'pending',
      itemsProcessed: 0,
      totalItems: 0
    }))
    
    await this.updateJob({
      stages: this.stages,
      currentStage: this.stages[0].name
    })
  }
  
  private async executeStage(stageName: string) {
    const stage = this.stages.find(s => s.name === stageName)!
    stage.status = 'processing'
    stage.startedAt = new Date()
    
    await this.updateJob({
      stages: this.stages,
      currentStage: stageName
    })
    
    try {
      switch (stageName) {
        case 'products':
          await this.syncProducts()
          break
        case 'variants':
          await this.syncVariants()
          break
        case 'modifiers':
          await this.syncModifiers()
          break
        case 'options':
          await this.syncOptions()
          break
        case 'images':
          await this.syncImages()
          break
        case 'seo':
          await this.syncSEO()
          break
        case 'inventory':
          await this.syncInventory()
          break
        case 'shipping':
          await this.syncShipping()
          break
      }
      
      stage.status = 'completed'
      stage.completedAt = new Date()
    } catch (error) {
      stage.status = 'failed'
      stage.errors = [error instanceof Error ? error.message : 'Unknown error']
      throw error
    } finally {
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProducts() {
    const storeHash = this.store.externalStoreId
    let page = 1
    let hasMorePages = true
    let allProducts: any[] = []
    
    while (hasMorePages) {
      if (await this.isCancelled()) return
      
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?include=images,variants,custom_fields&limit=250&page=${page}`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )
      
      const data = await response.json()
      allProducts = [...allProducts, ...data.data]
      
      // Update progress
      await this.updateStageProgress('products', allProducts.length, data.meta.pagination.total)
      
      hasMorePages = data.meta.pagination.current_page < data.meta.pagination.total_pages
      page++
    }
    
    // Save products to database
    for (const product of allProducts) {
      await this.saveProduct(product)
    }
  }
  
  private async syncVariants() {
    // Get all products that need variant sync
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'variants')!
    stage.totalItems = products.length
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductVariants(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductVariants(productId: string, externalId: string) {
    const storeHash = this.store.externalStoreId
    
    const response = await rateLimitedFetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${externalId}/variants`,
      {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Accept': 'application/json'
        }
      }
    )
    
    const data = await response.json()
    
    // Delete existing variants
    await db.productVariant.deleteMany({
      where: { productId }
    })
    
    // Save new variants
    for (const variant of data.data || []) {
      await db.productVariant.create({
        data: {
          productId,
          platform: 'BIGCOMMERCE',
          externalId: variant.id.toString(),
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.retail_price,
          costPrice: variant.cost_price,
          inventoryLevel: variant.inventory_level,
          weight: variant.weight,
          weightUnit: 'lb',
          optionValues: variant.option_values,
          images: variant.image_url ? { url: variant.image_url } : null,
          platformData: variant
        }
      })
    }
  }
  
  private async syncModifiers() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'modifiers')!
    stage.totalItems = products.length
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductModifiers(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductModifiers(productId: string, externalId: string) {
    const storeHash = this.store.externalStoreId
    
    const response = await rateLimitedFetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${externalId}/modifiers`,
      {
        headers: {
          'X-Auth-Token': this.accessToken,
          'Accept': 'application/json'
        }
      }
    )
    
    const data = await response.json()
    
    await db.productModifier.deleteMany({ where: { productId } })
    
    for (const modifier of data.data || []) {
      await db.productModifier.create({
        data: {
          productId,
          platform: 'BIGCOMMERCE',
          externalId: modifier.id.toString(),
          name: modifier.name,
          displayName: modifier.display_name,
          type: modifier.type,
          required: modifier.required,
          values: modifier.option_values,
          validation: modifier.config,
          platformData: modifier
        }
      })
    }
  }
  
  private async syncOptions() {
    // Similar to modifiers
    console.log('Syncing options...')
  }
  
  private async syncImages() {
    // Sync product images
    console.log('Syncing images...')
  }
  
  private async syncSEO() {
    // Sync SEO data
    console.log('Syncing SEO...')
  }
  
  private async syncInventory() {
    // Sync inventory levels
    console.log('Syncing inventory...')
  }
  
  private async syncShipping() {
    // Sync shipping data
    console.log('Syncing shipping...')
  }
  
  private async saveProduct(bcProduct: any) {
    const existing = await db.product.findFirst({
      where: {
        userId: this.store.userId,
        platform: 'BIGCOMMERCE',
        externalId: bcProduct.id.toString(),
        storeConnectionId: this.store.id
      }
    })
    
    const productData = {
      userId: this.store.userId,
      platform: 'BIGCOMMERCE' as const,
      externalId: bcProduct.id.toString(),
      storeConnectionId: this.store.id,
      importMethod: 'oauth' as const,
      name: bcProduct.name,
      description: bcProduct.description || null,
      sku: bcProduct.sku || null,
      price: bcProduct.price || 0,
      compareAtPrice: bcProduct.retail_price || null,
      categories: (bcProduct.categories || []).map((c: number) => c.toString()),
      tags: [],
      images: bcProduct.images ? { images: bcProduct.images } : undefined,
      variants: bcProduct.variants ? { variants: bcProduct.variants } : undefined,
      customFields: bcProduct.custom_fields ? { custom_fields: bcProduct.custom_fields } : undefined,
      platformData: bcProduct,
      lastSyncedAt: new Date(),
      syncStatus: 'synced'
    }
    
    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: productData
      })
    } else {
      await db.product.create({ data: productData })
    }
  }
  
  private async updateStageProgress(stageName: string, processed: number, total: number) {
    const stage = this.stages.find(s => s.name === stageName)!
    stage.itemsProcessed = processed
    stage.totalItems = total
    
    await this.updateJob({
      stages: this.stages,
      processedItems: this.getTotalProcessed()
    })
  }
  
  private getTotalProcessed(): number {
    return this.stages.reduce((sum, stage) => sum + stage.itemsProcessed, 0)
  }
  
  private async isCancelled(): Promise<boolean> {
    const job = await db.syncJob.findUnique({
      where: { id: this.jobId },
      select: { cancelRequested: true }
    })
    return job?.cancelRequested || false
  }
  
  private async isPaused(): Promise<boolean> {
    const job = await db.syncJob.findUnique({
      where: { id: this.jobId },
      select: { isPaused: true }
    })
    return job?.isPaused || false
  }
  
  private async waitForResume() {
    while (await this.isPaused()) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  private async markAsCancelled() {
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    })
  }
  
  private async complete() {
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processedItems: this.getTotalProcessed()
      }
    })
  }
  
  private async updateJob(data: any) {
    await db.syncJob.update({
      where: { id: this.jobId },
      data
    })
  }
}
```

### Step 2: Create Full Sync API Route

Create `app/api/stores/[id]/sync/full/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { FullSyncService } from '@/lib/sync/full-sync-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { background = true } = await req.json()
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    
    // Check for existing job
    const existingJob = await db.syncJob.findFirst({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      }
    })
    
    if (existingJob) {
      return NextResponse.json({
        success: false,
        error: 'A sync job is already running',
        jobId: existingJob.id
      }, { status: 409 })
    }
    
    // Create sync job
    const syncJob = await db.syncJob.create({
      data: {
        userId: session.user.id,
        platform: store.platform,
        action: 'full_sync',
        status: 'processing',
        startedAt: new Date(),
        stages: [],
        isPaused: false,
        cancelRequested: false
      }
    })
    
    // Start sync in background
    if (background) {
      const syncService = new FullSyncService(syncJob.id, store)
      syncService.execute().catch(console.error)
      
      return NextResponse.json({
        success: true,
        background: true,
        jobId: syncJob.id,
        message: 'Full sync started in background'
      })
    }
    
    // Execute sync and wait
    const syncService = new FullSyncService(syncJob.id, store)
    await syncService.execute()
    
    return NextResponse.json({
      success: true,
      jobId: syncJob.id
    })
    
  } catch (error) {
    console.error('Full sync error:', error)
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    )
  }
}
```

### Step 3: Add Pause/Resume Endpoints

Create `app/api/stores/[id]/sync/pause/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { jobId } = await req.json()
  
  await db.syncJob.update({
    where: { id: jobId },
    data: { isPaused: true }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Sync paused'
  })
}
```

Create `app/api/stores/[id]/sync/resume/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { jobId } = await req.json()
  
  await db.syncJob.update({
    where: { id: jobId },
    data: { isPaused: false }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Sync resumed'
  })
}
```

---

## Phase 3: Enhanced Progress Dialog

Update `components/products/SyncProgressDialog.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Pause, Play } from 'lucide-react'

interface Stage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed: number
  totalItems: number
}

export function EnhancedSyncProgressDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  jobId
}: Props) {
  const [status, setStatus] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(false)
  
  useEffect(() => {
    if (!open || !storeId) return
    
    const interval = setInterval(async () => {
      const res = await fetch(`/api/stores/${storeId}/sync-status?jobId=${jobId}`)
      const data = await res.json()
      setStatus(data)
      setIsPaused(data.isPaused)
      
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        clearInterval(interval)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [open, storeId, jobId])
  
  const handlePause = async () => {
    await fetch(`/api/stores/${storeId}/sync/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    })
    setIsPaused(true)
  }
  
  const handleResume = async () => {
    await fetch(`/api/stores/${storeId}/sync/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    })
    setIsPaused(false)
  }
  
  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this sync?')) {
      await fetch(`/api/stores/${storeId}/sync/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: 'User cancelled' })
      })
      onOpenChange(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Full Product Sync - {storeName}</DialogTitle>
        </DialogHeader>
        
        {/* Overall Progress */}
        <div className="space-y-4 py-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{status?.progress || 0}%</span>
            </div>
            <Progress value={status?.progress || 0} />
          </div>
          
          {/* Stages */}
          {status?.stages && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Sync Stages</h4>
              {status.stages.map((stage: Stage) => (
                <div key={stage.name} className="flex items-center gap-2 p-2 rounded border">
                  {stage.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {stage.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                  {stage.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  {stage.status === 'pending' && <div className="h-4 w-4 rounded-full border-2" />}
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize">{stage.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {stage.itemsProcessed} / {stage.totalItems || '?'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            {isPaused ? (
              <Button onClick={handleResume} size="sm">
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            ) : (
              <Button onClick={handlePause} size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            <Button onClick={handleCancel} size="sm" variant="destructive">
              Cancel Sync
            </Button>
            
            <div className="flex-1" />
            
            <Button onClick={() => onOpenChange(false)} size="sm" variant="ghost">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Phase 4: Testing

### Test Full Sync

```bash
# Start development server
npm run dev

# In another terminal, trigger sync via curl
curl -X POST http://localhost:3000/api/stores/STORE_ID/sync/full \
  -H "Content-Type: application/json" \
  -d '{"background": true}'

# Monitor progress
curl http://localhost:3000/api/stores/STORE_ID/sync-status?jobId=JOB_ID

# Pause sync
curl -X POST http://localhost:3000/api/stores/STORE_ID/sync/pause \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JOB_ID"}'

# Resume sync
curl -X POST http://localhost:3000/api/stores/STORE_ID/sync/resume \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JOB_ID"}'

# Cancel sync
curl -X POST http://localhost:3000/api/stores/STORE_ID/sync/cancel \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JOB_ID"}'
```

---

## Next Steps

1. ✅ Complete Phase 1: Database schema
2. ✅ Complete Phase 2: Sync engine
3. ✅ Complete Phase 3: Progress UI
4. ⏳ Phase 4: Advanced edit interface (separate guide)
5. ⏳ Phase 5: Cross-listing system (separate guide)
