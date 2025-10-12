import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { rateLimitedFetch, logRateLimitStatus } from '@/lib/bigcommerce/rate-limiter'

/**
 * Sync products from store
 * POST /api/stores/[id]/sync
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { background } = await req.json().catch(() => ({ background: false }))
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    if (!store.isActive) {
      return NextResponse.json(
        { error: 'Store is inactive' },
        { status: 400 }
      )
    }
    
    // Check if there's already a sync job running
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
        error: 'A sync job is already running for this platform',
        jobId: existingJob.id
      }, { status: 409 })
    }
    
    // Create sync job
    const syncJob = await db.syncJob.create({
      data: {
        userId: session.user.id,
        platform: store.platform,
        action: 'product_sync',
        status: 'processing',
        startedAt: new Date()
      }
    })
    
    // For large syncs (background mode), start async and return immediately
    if (background) {
      // Start sync in background (non-blocking)
      performSync(store, syncJob.id).catch(console.error)
      
      return NextResponse.json({
        success: true,
        background: true,
        jobId: syncJob.id,
        message: 'Sync started in background. Check sync job status for progress.'
      })
    }
    
    // For regular sync, wait for completion
    const productCount = await performSync(store, syncJob.id)
    
    return NextResponse.json({
      success: true,
      productCount,
      jobId: syncJob.id
    })
    
  } catch (error) {
    console.error('Store sync error:', error)
    
    return NextResponse.json(
      { error: 'Failed to start sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Perform the actual sync operation
async function performSync(store: any, jobId: string): Promise<number> {
  try {
    const accessToken = decrypt(store.accessToken)
    let productCount = 0
    
    switch (store.platform) {
      case 'SHOPIFY':
        productCount = await syncShopifyProducts(store, accessToken)
        break
      case 'ETSY':
        productCount = await syncEtsyProducts(store, accessToken)
        break
      case 'BIGCOMMERCE':
        productCount = await syncBigCommerceProducts(store, accessToken)
        break
      case 'TIKTOK':
        productCount = await syncTikTokProducts(store, accessToken)
        break
      default:
        throw new Error('Unsupported platform')
    }
    
    // Update store sync status
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'connected',
        syncError: null
      }
    })
    
    // Update sync job as completed
    await db.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedItems: productCount,
        completedAt: new Date()
      }
    })
    
    return productCount
  } catch (error) {
    console.error('Sync error:', error)
    
    // Update store with error
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      }
    }).catch(console.error)
    
    // Update sync job as failed
    await db.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    }).catch(console.error)
    
    throw error
  }
}

// Platform-specific sync functions (placeholders for now)
async function syncShopifyProducts(store: any, accessToken: string): Promise<number> {
  // Will implement full Shopify product import
  // For now, just return mock count
  return 0
}

async function syncEtsyProducts(store: any, accessToken: string): Promise<number> {
  // Will implement Etsy product import
  return 0
}

async function syncBigCommerceProducts(store: any, accessToken: string): Promise<number> {
  try {
    const storeHash = store.externalStoreId
    let allProducts: any[] = []
    let page = 1
    let hasMorePages = true
    
    console.log(`🔄 Starting BigCommerce product sync for store: ${store.storeName}`)
    
    // Fetch all products with pagination and rate limiting
    while (hasMorePages) {
      console.log(`📦 Fetching products page ${page}...`)
      logRateLimitStatus()
      
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=250&page=${page}`,
        {
          headers: {
            'X-Auth-Token': accessToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }
      
      const data = await response.json()
      allProducts = [...allProducts, ...data.data]
      
      console.log(`✓ Fetched ${data.data.length} products (Total: ${allProducts.length})`)
      
      // Check if there are more pages
      hasMorePages = data.meta.pagination.current_page < data.meta.pagination.total_pages
      page++
    }
    
    console.log(`📊 Total products fetched: ${allProducts.length}`)
    
    // Process and save products to database in batches
    let syncedCount = 0
    const batchSize = 50 // Process 50 products at a time
    
    console.log(`💾 Saving products to database in batches of ${batchSize}...`)
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize)
      
      for (const bcProduct of batch) {
        try {
          // Check if product already exists
          const existing = await db.product.findFirst({
            where: {
              userId: store.userId,
              platform: 'BIGCOMMERCE',
              externalId: bcProduct.id.toString(),
              storeConnectionId: store.id
            }
          })
          
          const productData = {
            userId: store.userId,
            platform: 'BIGCOMMERCE' as const,
            externalId: bcProduct.id.toString(),
            storeConnectionId: store.id,
            importMethod: 'oauth',
            name: bcProduct.name,
            description: bcProduct.description || null,
            sku: bcProduct.sku || null,
            price: bcProduct.price || 0,
            compareAtPrice: bcProduct.retail_price || null,
            categories: bcProduct.categories || [],
            tags: [],
            images: bcProduct.images ? { images: bcProduct.images } : undefined,
            variants: bcProduct.variants ? { variants: bcProduct.variants } : undefined,
            customFields: bcProduct.custom_fields ? { custom_fields: bcProduct.custom_fields } : undefined,
            platformData: bcProduct,
            lastSyncedAt: new Date(),
            syncStatus: 'synced'
          }
          
          if (existing) {
            // Update existing product
            await db.product.update({
              where: { id: existing.id },
              data: productData
            })
          } else {
            // Create new product
            await db.product.create({
              data: productData
            })
          }
          
          syncedCount++
        } catch (productError) {
          console.error(`❌ Failed to sync product ${bcProduct.id}:`, productError)
          // Continue with next product
        }
      }
      
      console.log(`✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} (${syncedCount} products synced)`)
    }
    
    // Update store's product count
    await db.storeConnection.update({
      where: { id: store.id },
      data: { productCount: syncedCount }
    })
    
    console.log(`✅ Sync complete! ${syncedCount} products synced successfully`)
    logRateLimitStatus()
    
    return syncedCount
  } catch (error) {
    console.error('BigCommerce sync error:', error)
    throw error
  }
}

async function syncTikTokProducts(store: any, accessToken: string): Promise<number> {
  // Will implement TikTok product import
  return 0
}