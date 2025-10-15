import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { rateLimitedFetch, logRateLimitStatus } from '@/lib/bigcommerce/rate-limiter'
import { canPerformAction, checkFeatureAccess } from '@/lib/subscription/enforcement'
import { classifyError, getUserMessage, formatErrorForLog } from '@/lib/sync-errors'

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
    
    // Note: All platforms available in store-based model
    // Billing is handled per-store via automatic pricing tier assignment
    
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

// Assign pricing tier based on product count
async function assignStorePricingTier(storeId: string, productCount: number): Promise<void> {
  try {
    console.log(`📊 Assigning pricing tier for ${productCount} products...`)
    
    // Find the appropriate pricing tier based on product count
    const tier = await db.storePricingTier.findFirst({
      where: {
        AND: [
          { minProducts: { lte: productCount } },
          {
            OR: [
              { maxProducts: { gte: productCount } },
              { maxProducts: -1 } // Unlimited tier
            ]
          },
          { isActive: true }
        ]
      },
      orderBy: {
        minProducts: 'asc'
      }
    })
    
    if (!tier) {
      console.error(`❌ No pricing tier found for ${productCount} products`)
      return
    }
    
    console.log(`✅ Found pricing tier: ${tier.name} ($${tier.monthlyPrice}/mo)`)
    
    // Get store info
    const store = await db.storeConnection.findUnique({
      where: { id: storeId },
      include: {
        storeSubscription: true
      }
    })
    
    if (!store) {
      console.error(`❌ Store ${storeId} not found`)
      return
    }
    
    // Create or update store subscription
    if (store.storeSubscription) {
      await db.storeSubscription.update({
        where: { id: store.storeSubscription.id },
        data: {
          pricingTierId: tier.id,
          productCount: productCount
        }
      })
      console.log(`✅ Updated store subscription to ${tier.name} tier`)
    } else {
      await db.storeSubscription.create({
        data: {
          storeConnectionId: storeId,
          userId: store.userId,
          pricingTierId: tier.id,
          productCount: productCount,
          status: 'ACTIVE'
        }
      })
      console.log(`✅ Created store subscription with ${tier.name} tier`)
    }
  } catch (error) {
    console.error('Failed to assign pricing tier:', error)
  }
}

// Perform the actual sync operation
async function performSync(store: any, jobId: string): Promise<number> {
  try {
    const accessToken = decrypt(store.accessToken)
    let productCount = 0
    
    // Pass jobId to platform-specific sync functions
    switch (store.platform) {
      case 'SHOPIFY':
        productCount = await syncShopifyProducts(store, accessToken, jobId)
        break
      case 'ETSY':
        productCount = await syncEtsyProducts(store, accessToken, jobId)
        break
      case 'BIGCOMMERCE':
        productCount = await syncBigCommerceProducts(store, accessToken, jobId)
        break
      case 'TIKTOK':
        productCount = await syncTikTokProducts(store, accessToken, jobId)
        break
      default:
        throw new Error('Unsupported platform')
    }
    
    // Update store sync status and product count
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'connected',
        syncError: null,
        productCount: productCount
      }
    })
    
    // Assign/update pricing tier based on product count
    await assignStorePricingTier(store.id, productCount)
    
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
    
    // Classify the error for better user messaging
    const errorInfo = classifyError(error)
    const userMessage = getUserMessage(error)
    const errorLog = formatErrorForLog(error, {
      storeId: store.id,
      storeName: store.storeName,
      platform: store.platform
    })
    
    console.error('Classified error:', errorLog)
    
    // Update store with detailed error
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        syncStatus: 'error',
        syncError: userMessage
      }
    }).catch(console.error)
    
    // Update sync job as failed with detailed error info
    await db.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorLog: errorLog,
        completedAt: new Date()
      }
    }).catch(console.error)
    
    throw error
  }
}

// Platform-specific sync functions
async function syncShopifyProducts(store: any, accessToken: string, jobId: string): Promise<number> {
  try {
    const shopDomain = store.storeUrl || store.externalStoreId
    let allProducts: any[] = []
    let nextPageInfo: string | null = null
    let hasNextPage = true
    
    console.log(`🔄 Starting Shopify product sync for store: ${store.storeName}`)
    
    while (hasNextPage) {
      const url: string = nextPageInfo
        ? `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&page_info=${nextPageInfo}`
        : `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`
      
      const response: Response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify products: ${response.statusText}`)
      }
      
      const data = await response.json()
      allProducts = [...allProducts, ...(data.products || [])]
      
      // Shopify uses Link header for pagination
      const linkHeader: string | null = response.headers.get('Link')
      nextPageInfo = linkHeader?.match(/<[^>]*page_info=([^&>]+)/)?.[1] || null
      hasNextPage = !!nextPageInfo
      
      console.log(`✓ Fetched ${data.products?.length || 0} products (Total: ${allProducts.length})`)
    }
    
    console.log(`📊 Total Shopify products fetched: ${allProducts.length}`)
    
    // Save to database
    let syncedCount = 0
    for (const shopifyProduct of allProducts) {
      try {
        const existing = await db.product.findFirst({
          where: {
            userId: store.userId,
            platform: 'SHOPIFY',
            externalId: shopifyProduct.id.toString(),
            storeConnectionId: store.id
          }
        })
        
        const productData = {
          userId: store.userId,
          platform: 'SHOPIFY' as const,
          externalId: shopifyProduct.id.toString(),
          storeConnectionId: store.id,
          importMethod: 'oauth',
          name: shopifyProduct.title,
          description: shopifyProduct.body_html || null,
          sku: shopifyProduct.variants?.[0]?.sku || null,
          price: parseFloat(shopifyProduct.variants?.[0]?.price || '0'),
          compareAtPrice: shopifyProduct.variants?.[0]?.compare_at_price
            ? parseFloat(shopifyProduct.variants[0].compare_at_price)
            : null,
          categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
          tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map((t: string) => t.trim()) : [],
          images: shopifyProduct.images ? { images: shopifyProduct.images } : undefined,
          variants: shopifyProduct.variants ? { variants: shopifyProduct.variants } : undefined,
          platformData: shopifyProduct,
          lastSyncedAt: new Date(),
          syncStatus: 'synced'
        }
        
        if (existing) {
          await db.product.update({ where: { id: existing.id }, data: productData })
        } else {
          await db.product.create({ data: productData })
        }
        
        syncedCount++
      } catch (productError) {
        console.error(`❌ Failed to sync Shopify product ${shopifyProduct.id}:`, productError)
      }
    }
    
    await db.storeConnection.update({
      where: { id: store.id },
      data: { productCount: syncedCount }
    })
    
    console.log(`✅ Shopify sync complete! ${syncedCount} products synced`)
    return syncedCount
  } catch (error) {
    console.error('Shopify sync error:', error)
    throw error
  }
}

async function syncEtsyProducts(store: any, accessToken: string, jobId: string): Promise<number> {
  try {
    const shopId = store.externalStoreId
    let allProducts: any[] = []
    let offset = 0
    const limit = 100
    
    console.log(`🔄 Starting Etsy product sync for store: ${store.storeName}`)
    
    while (true) {
      const response = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'x-api-key': process.env.ETSY_API_KEY || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Etsy products: ${response.statusText}`)
      }
      
      const data = await response.json()
      const products = data.results || []
      
      if (products.length === 0) break
      
      allProducts = [...allProducts, ...products]
      offset += limit
      
      console.log(`✓ Fetched ${products.length} products (Total: ${allProducts.length})`)
      
      if (products.length < limit) break
    }
    
    console.log(`📊 Total Etsy products fetched: ${allProducts.length}`)
    
    // Save to database
    let syncedCount = 0
    for (const etsyProduct of allProducts) {
      try {
        const existing = await db.product.findFirst({
          where: {
            userId: store.userId,
            platform: 'ETSY',
            externalId: etsyProduct.listing_id.toString(),
            storeConnectionId: store.id
          }
        })
        
        const productData = {
          userId: store.userId,
          platform: 'ETSY' as const,
          externalId: etsyProduct.listing_id.toString(),
          storeConnectionId: store.id,
          importMethod: 'oauth',
          name: etsyProduct.title,
          description: etsyProduct.description || null,
          sku: etsyProduct.sku || null,
          price: parseFloat(etsyProduct.price?.amount || '0') / 100, // Etsy uses cents
          compareAtPrice: null,
          categories: etsyProduct.taxonomy_id ? [etsyProduct.taxonomy_id.toString()] : [],
          tags: etsyProduct.tags || [],
          images: etsyProduct.images ? { images: etsyProduct.images } : undefined,
          platformData: etsyProduct,
          lastSyncedAt: new Date(),
          syncStatus: 'synced'
        }
        
        if (existing) {
          await db.product.update({ where: { id: existing.id }, data: productData })
        } else {
          await db.product.create({ data: productData })
        }
        
        syncedCount++
      } catch (productError) {
        console.error(`❌ Failed to sync Etsy product ${etsyProduct.listing_id}:`, productError)
      }
    }
    
    await db.storeConnection.update({
      where: { id: store.id },
      data: { productCount: syncedCount }
    })
    
    console.log(`✅ Etsy sync complete! ${syncedCount} products synced`)
    return syncedCount
  } catch (error) {
    console.error('Etsy sync error:', error)
    throw error
  }
}
/**
 * Enrich BigCommerce products with detailed data
 * Fetches variants, modifiers, options, and full image data
 */
async function enrichBigCommerceProducts(
  products: any[],
  storeHash: string,
  accessToken: string
): Promise<any[]> {
  const enriched: any[] = []
  
  console.log(`🔍 Enriching ${products.length} products with detailed data...`)
  
  for (const product of products) {
    try {
      const productId = product.id
      
      // Fetch detailed product variants (if product has variants)
      let enrichedVariants = product.variants || []
      if (product.variants && product.variants.length > 0) {
        try {
          const variantsResponse = await rateLimitedFetch(
            `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/variants`,
            {
              headers: {
                'X-Auth-Token': accessToken,
                'Accept': 'application/json',
              }
            }
          )
          
          if (variantsResponse.ok) {
            const variantsData = await variantsResponse.json()
            enrichedVariants = variantsData.data || product.variants
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch variants for product ${productId}:`, error)
        }
      }
      
      // Fetch product modifiers (text fields, checkboxes, etc.)
      let enrichedModifiers: any[] = []
      try {
        const modifiersResponse = await rateLimitedFetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/modifiers`,
          {
            headers: {
              'X-Auth-Token': accessToken,
              'Accept': 'application/json',
            }
          }
        )
        
        if (modifiersResponse.ok) {
          const modifiersData = await modifiersResponse.json()
          enrichedModifiers = modifiersData.data || []
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch modifiers for product ${productId}:`, error)
      }
      
      // Fetch product options (color, size, etc.)
      let enrichedOptions: any[] = []
      try {
        const optionsResponse = await rateLimitedFetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/options`,
          {
            headers: {
              'X-Auth-Token': accessToken,
              'Accept': 'application/json',
            }
          }
        )
        
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json()
          enrichedOptions = optionsData.data || []
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch options for product ${productId}:`, error)
      }
      
      // Fetch all product images with full metadata
      let enrichedImages = product.images || []
      try {
        const imagesResponse = await rateLimitedFetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/images`,
          {
            headers: {
              'X-Auth-Token': accessToken,
              'Accept': 'application/json',
            }
          }
        )
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json()
          enrichedImages = imagesData.data || product.images
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch images for product ${productId}:`, error)
      }
      
      // Fetch brand information if brand_id exists
      let brandName = null
      if (product.brand_id && product.brand_id > 0) {
        try {
          const brandResponse = await rateLimitedFetch(
            `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/brands/${product.brand_id}`,
            {
              headers: {
                'X-Auth-Token': accessToken,
                'Accept': 'application/json',
              }
            }
          )
          
          if (brandResponse.ok) {
            const brandData = await brandResponse.json()
            brandName = brandData.data?.name || null
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch brand for product ${productId}:`, error)
        }
      }
      
      enriched.push({
        ...product,
        enrichedVariants,
        enrichedModifiers,
        enrichedOptions,
        enrichedImages,
        brand_name: brandName
      })
      
    } catch (error) {
      console.error(`❌ Failed to enrich product ${product.id}:`, error)
      // Still include the product with basic data
      enriched.push(product)
    }
  }
  
  console.log(`✅ Enriched ${enriched.length} products with detailed data`)
  return enriched
}


async function syncBigCommerceProducts(store: any, accessToken: string, jobId: string): Promise<number> {
  try {
    const storeHash = store.externalStoreId
    let allProducts: any[] = []
    let page = 1
    let hasMorePages = true
    
    console.log(`🔄 Starting BigCommerce product sync for store: ${store.storeName}`)
    
    // Fetch all products with pagination and rate limiting
    // Include ALL necessary data: images, variants, modifiers, custom_fields, bulk_pricing_rules
    while (hasMorePages) {
      console.log(`📦 Fetching products page ${page}...`)
      logRateLimitStatus()
      
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=250&page=${page}&include=images,variants,custom_fields,bulk_pricing_rules,primary_image,modifiers,options`,
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
    
    // Update job with total items
    await db.syncJob.update({
      where: { id: jobId },
      data: {
        totalItems: allProducts.length
      }
    }).catch(() => {}) // Ignore if job doesn't exist
    
    // Note: All detailed data already included via ?include= parameter in initial fetch
    // No need for additional API calls - data is already enriched!
    console.log(`📦 Processing ${allProducts.length} products with complete data...`)
    
    // Process and save products to database in batches
    let syncedCount = 0
    let failedCount = 0
    const batchSize = 50 // Process 50 products at a time
    const errors: string[] = []
    
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
          
          // Build comprehensive product data with all details
          const productData = {
            userId: store.userId,
            platform: 'BIGCOMMERCE' as const,
            externalId: bcProduct.id.toString(),
            storeConnectionId: store.id,
            importMethod: 'oauth' as const,
            name: bcProduct.name,
            description: bcProduct.description || null,
            sku: bcProduct.sku || null,
            price: bcProduct.price || 0,
            compareAtPrice: bcProduct.retail_price || bcProduct.sale_price || null,
            categories: (bcProduct.categories || []).map((c: number) => c.toString()),
            tags: bcProduct.search_keywords ? bcProduct.search_keywords.split(',').map((t: string) => t.trim()) : [],
            images: bcProduct.images ? {
              images: bcProduct.images,
              primary_image: bcProduct.primary_image
            } : undefined,
            variants: bcProduct.variants ? {
              variants: bcProduct.variants,
              has_variants: (bcProduct.variants?.length || 0) > 0
            } : undefined,
            customFields: {
              custom_fields: bcProduct.custom_fields || [],
              modifiers: bcProduct.modifiers || [],
              options: bcProduct.options || [],
              brand_id: bcProduct.brand_id,
              brand_name: bcProduct.brand?.name || null,
              weight: bcProduct.weight,
              width: bcProduct.width,
              height: bcProduct.height,
              depth: bcProduct.depth,
              condition: bcProduct.condition,
              type: bcProduct.type,
              availability: bcProduct.availability,
              inventory_level: bcProduct.inventory_level,
              inventory_tracking: bcProduct.inventory_tracking
            },
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
            console.log(`✓ Updated product ${bcProduct.id}: ${bcProduct.name}`)
          } else {
            // Create new product
            await db.product.create({
              data: productData
            })
            console.log(`✓ Created product ${bcProduct.id}: ${bcProduct.name}`)
          }
          
          syncedCount++
        } catch (productError) {
          failedCount++
          const errorMsg = productError instanceof Error ? productError.message : String(productError)
          console.error(`❌ Failed to sync product ${bcProduct.id} (${bcProduct.name}):`, productError)
          errors.push(`Product ${bcProduct.id}: ${errorMsg}`)
          
          // If we're getting too many errors, abort the sync
          if (failedCount > 10 && failedCount > syncedCount) {
            throw new Error(`Sync aborted: Too many failures (${failedCount} failed, ${syncedCount} succeeded). Last error: ${errorMsg}`)
          }
        }
      }
      
      // Update job progress after each batch
      await db.syncJob.update({
        where: { id: jobId },
        data: {
          processedItems: syncedCount + failedCount,
          results: {
            synced: syncedCount,
            failed: failedCount,
            total: allProducts.length
          }
        }
      }).catch(() => {}) // Ignore if job doesn't exist
      
      console.log(`✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} (${syncedCount} synced, ${failedCount} failed)`)
    }
    
    // Log final results
    console.log(`\n📊 Sync Summary:`)
    console.log(`   Total products fetched: ${allProducts.length}`)
    console.log(`   Successfully synced: ${syncedCount}`)
    console.log(`   Failed: ${failedCount}`)
    
    if (errors.length > 0) {
      console.error(`\n⚠️ Errors encountered:`)
      errors.slice(0, 10).forEach(err => console.error(`   - ${err}`))
      if (errors.length > 10) {
        console.error(`   ... and ${errors.length - 10} more errors`)
      }
    }
    
    // If nothing was synced, throw an error
    if (syncedCount === 0 && allProducts.length > 0) {
      throw new Error(`Failed to sync any products. ${errors.length > 0 ? 'First error: ' + errors[0] : 'Unknown error'}`)
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

async function syncTikTokProducts(store: any, accessToken: string, jobId: string): Promise<number> {
  try {
    const shopId = store.externalStoreId
    let allProducts: any[] = []
    let pageToken: string | null = null
    
    console.log(`🔄 Starting TikTok product sync for store: ${store.storeName}`)
    
    while (true) {
      const url: string = pageToken
        ? `https://open-api.tiktokglobalshop.com/product/202309/products/search?page_size=100&page_token=${pageToken}`
        : `https://open-api.tiktokglobalshop.com/product/202309/products/search?page_size=100`
      
      const response: Response = await fetch(url, {
        headers: {
          'x-tts-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch TikTok products: ${response.statusText}`)
      }
      
      const data: any = await response.json()
      const products: any[] = data.data?.products || []
      
      if (products.length === 0) break
      
      allProducts = [...allProducts, ...products]
      pageToken = data.data?.next_page_token || null
      
      console.log(`✓ Fetched ${products.length} products (Total: ${allProducts.length})`)
      
      if (!pageToken) break
    }
    
    console.log(`📊 Total TikTok products fetched: ${allProducts.length}`)
    
    // Save to database
    let syncedCount = 0
    for (const tiktokProduct of allProducts) {
      try {
        const existing = await db.product.findFirst({
          where: {
            userId: store.userId,
            platform: 'TIKTOK',
            externalId: tiktokProduct.id.toString(),
            storeConnectionId: store.id
          }
        })
        
        const productData = {
          userId: store.userId,
          platform: 'TIKTOK' as const,
          externalId: tiktokProduct.id.toString(),
          storeConnectionId: store.id,
          importMethod: 'oauth',
          name: tiktokProduct.title,
          description: tiktokProduct.description || null,
          sku: tiktokProduct.skus?.[0]?.seller_sku || null,
          price: parseFloat(tiktokProduct.skus?.[0]?.price?.amount || '0'),
          compareAtPrice: tiktokProduct.skus?.[0]?.original_price?.amount
            ? parseFloat(tiktokProduct.skus[0].original_price.amount)
            : null,
          categories: tiktokProduct.category_chains ? [tiktokProduct.category_chains[0]?.local_name || ''] : [],
          tags: [],
          images: tiktokProduct.images ? { images: tiktokProduct.images } : undefined,
          variants: tiktokProduct.skus ? { skus: tiktokProduct.skus } : undefined,
          platformData: tiktokProduct,
          lastSyncedAt: new Date(),
          syncStatus: 'synced'
        }
        
        if (existing) {
          await db.product.update({ where: { id: existing.id }, data: productData })
        } else {
          await db.product.create({ data: productData })
        }
        
        syncedCount++
      } catch (productError) {
        console.error(`❌ Failed to sync TikTok product ${tiktokProduct.id}:`, productError)
      }
    }
    
    await db.storeConnection.update({
      where: { id: store.id },
      data: { productCount: syncedCount }
    })
    
    console.log(`✅ TikTok sync complete! ${syncedCount} products synced`)
    return syncedCount
  } catch (error) {
    console.error('TikTok sync error:', error)
    throw error
  }
}