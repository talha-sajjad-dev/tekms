import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

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
    
    // Decrypt access token
    const accessToken = decrypt(store.accessToken)
    
    // Platform-specific sync logic
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
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        )
    }
    
    // Update last synced time
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'connected',
        syncError: null
      }
    })
    
    return NextResponse.json({
      success: true,
      productCount
    })
    
  } catch (error) {
    console.error('Store sync error:', error)
    
    // Update sync error
    try {
      await db.storeConnection.update({
        where: { id: params.id },
        data: {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    } catch (updateError) {
      console.error('Failed to update sync error:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Failed to sync store', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
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
    
    // Fetch all products with pagination
    while (hasMorePages) {
      const response = await fetch(
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
      
      // Check if there are more pages
      hasMorePages = data.meta.pagination.current_page < data.meta.pagination.total_pages
      page++
    }
    
    // Process and save products to database
    let syncedCount = 0
    
    for (const bcProduct of allProducts) {
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
          images: bcProduct.images ? { images: bcProduct.images } : null,
          variants: bcProduct.variants ? { variants: bcProduct.variants } : null,
          customFields: bcProduct.custom_fields ? { custom_fields: bcProduct.custom_fields } : null,
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
        console.error(`Failed to sync product ${bcProduct.id}:`, productError)
        // Continue with next product
      }
    }
    
    // Update store's product count
    await db.storeConnection.update({
      where: { id: store.id },
      data: { productCount: syncedCount }
    })
    
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