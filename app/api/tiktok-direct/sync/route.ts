import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/bigcommerce'
import { createProduct } from '@/lib/tiktok/api-client'
import { transformProduct } from '@/lib/tiktok/product-transformer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, shopId, categoryId, warehouseId, brandId } = body
    
    if (!accessToken || !shopId || !categoryId || !warehouseId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: accessToken, shopId, categoryId, warehouseId'
      }, { status: 400 })
    }
    
    // Step 1: Fetch products from BigCommerce
    console.log('📦 Fetching products from BigCommerce...')
    const bcResponse = await getProducts()
    const bcProducts = bcResponse.data || []
    
    console.log(`✅ Fetched ${bcProducts.length} products from BigCommerce`)
    
    // Step 2: Sync products to TikTok
    const syncResults = {
      totalProducts: bcProducts.length,
      synced: 0,
      failed: 0,
      errors: [] as any[]
    }
    
    for (const bcProduct of bcProducts) {
      try {
        // Transform BigCommerce product to TikTok format
        const tiktokProduct = transformProduct(bcProduct, {
          categoryId,
          warehouseId,
          brandId
        })
        
        // Create product on TikTok
        await createProduct(accessToken, shopId, tiktokProduct)
        
        syncResults.synced++
        console.log(`✅ Synced product: ${bcProduct.name}`)
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        syncResults.failed++
        syncResults.errors.push({
          productId: bcProduct.id,
          productName: bcProduct.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Failed to sync product ${bcProduct.name}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.synced} of ${syncResults.totalProducts} products`,
      status: {
        totalProducts: syncResults.totalProducts,
        synced: syncResults.synced,
        failed: syncResults.failed,
        inProgress: false
      },
      errors: syncResults.errors
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}