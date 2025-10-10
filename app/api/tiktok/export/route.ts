import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { readTikTokTemplate, createTikTokExcel } from '@/lib/tiktok/excel-utils'
import { batchProcessProducts } from '@/lib/tiktok/data-mapper'
import { enforceUsageLimit, trackUsage } from '@/lib/usage/tracker'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { productIds, selectedGroups, includeVariants = true } = body
    
    console.log('=== TIKTOK EXPORT REQUEST ===')
    console.log('Product IDs:', productIds?.length || 'Not specified')
    console.log('Selected Groups:', selectedGroups?.length || 'Not specified')
    console.log('Include variants:', includeVariants)

    // Calculate product count for usage tracking
    const productCount = productIds?.length || 0
    
    // Check usage limit before processing
    if (productCount > 0) {
      try {
        await enforceUsageLimit(session.user.id, productCount)
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Usage limit exceeded',
          limitExceeded: true
        }, { status: 403 })
      }
    }
    
    // Read the template
    const template = await readTikTokTemplate()
    
    // Fetch products
    let products = []
    
    if (productIds && productIds.length > 0) {
      // Fetch specific products by ID - EFFICIENT METHOD
      console.log(`Fetching ${productIds.length} specific products by ID...`)
      
      for (const productId of productIds) {
        try {
          const response = await fetch(`${API_URL}/catalog/products/${productId}?include=images,modifiers`, {
            headers,
            cache: "no-store",
          })
          
          if (response.ok) {
            const data = await response.json()
            products.push(data.data)
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error)
        }
        
        // Small delay to avoid rate limiting
        if (productIds.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log(`Successfully fetched ${products.length} products`)
    } else {
      // Fetch all products (fallback)
      console.log('Fetching all products...')
      
      let allProducts: any[] = []
      let currentPage = 1
      let hasMorePages = true
      
      while (hasMorePages) {
        const response = await fetch(
          `${API_URL}/catalog/products?limit=250&page=${currentPage}&include=images,modifiers`,
          {
            headers,
            cache: "no-store",
          }
        )
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`)
        }
        
        const data = await response.json()
        const pageProducts = data.data || []
        
        allProducts = [...allProducts, ...pageProducts]
        
        // Check if there are more pages
        const totalPages = data.meta?.pagination?.total_pages || 1
        hasMorePages = currentPage < totalPages
        currentPage++
        
        console.log(`Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`)
        
        // Rate limiting
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      products = allProducts
    }
    
    console.log(`Total products to export: ${products.length}`)
    
    // Fetch categories for mapping
    const categoriesResponse = await fetch(`${API_URL}/catalog/categories?limit=250`, {
      headers,
      cache: "no-store",
    })
    
    const categoriesData = await categoriesResponse.json()
    const categories = categoriesData.data || []
    
    // Create category mapping
    const categoryMapping: Record<number, string> = {}
    categories.forEach((cat: any) => {
      categoryMapping[cat.id] = cat.name
    })
    
    // Process products to TikTok format
    const tiktokProducts = batchProcessProducts(products, categoryMapping)
    
    console.log(`Processed ${tiktokProducts.length} TikTok products (including variants)`)
    
    // Track usage (count base products exported, not variants)
    if (products.length > 0) {
      await trackUsage({
        userId: session.user.id,
        action: 'TIKTOK_EXPORT',
        productCount: products.length,
        platform: 'TIKTOK',
        metadata: {
          productsExported: products.length,
          tiktokProductsGenerated: tiktokProducts.length,
          includeVariants
        }
      })
    }
    
    // Create Excel file with TikTok products (preserving template data)
    const excelBuffer = await createTikTokExcel(tiktokProducts, template)
    
    // Return the file
    return new NextResponse(Buffer.from(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tiktok-products-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exporting to TikTok:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch products formatted for TikTok preview
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    
    console.log('=== FETCHING PRODUCTS FOR TIKTOK PREVIEW ===')
    console.log('Requested limit:', limit)
    console.log('Requested page:', page)
    console.log('Search term:', search || 'None')
    
    // Build API URL with optional search
    // Note: include=modifiers limits results to 10 products max in BigCommerce API
    // For preview, we only need images, not full modifier details
    let apiUrl = `${API_URL}/catalog/products?limit=${limit}&page=${page}&include=images`
    
    // Add search filter if provided - let BigCommerce API handle the search
    if (search) {
      apiUrl += `&keyword=${encodeURIComponent(search)}`
    }
    
    // Fetch products
    console.log('Calling BigCommerce API:', apiUrl)
    const response = await fetch(apiUrl, {
      headers,
      cache: "no-store",
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }
    
    const data = await response.json()
    let products = data.data || []
    
    console.log('BigCommerce returned:', {
      productsCount: products.length,
      pagination: data.meta?.pagination
    })
    
    // Fetch categories
    const categoriesResponse = await fetch(`${API_URL}/catalog/categories?limit=250`, {
      headers,
      cache: "no-store",
    })
    
    const categoriesData = await categoriesResponse.json()
    const categories = categoriesData.data || []
    
    // Create category mapping
    const categoryMapping: Record<number, string> = {}
    categories.forEach((cat: any) => {
      categoryMapping[cat.id] = cat.name
    })
    
    // For preview, we don't expand variants - just show base products
    // This prevents the "too many combinations" issue and keeps the preview fast
    const tiktokProducts: any[] = []
    
    products.forEach((product: any) => {
      const categoryId = product.categories?.[0]
      const categoryName = categoryId ? categoryMapping[categoryId] || 'General' : 'General'
      
      // Just create base product without variant expansion
      const images = product.images || []
      const sortedImages = images.sort((a: any, b: any) => {
        if (!a.is_thumbnail && b.is_thumbnail) return -1
        if (a.is_thumbnail && !b.is_thumbnail) return 1
        return 0
      })
      
      const baseProduct: any = {
        'Product Title': product.name,
        'Description': (product.description || '').replace(/<[^>]*>/g, '').trim().substring(0, 200),
        'Price': product.sale_price || product.price,
        'SKU': product.sku,
        'Category': categoryName,
        'Brand': product.brand_name || 'Unbranded',
        'Status': product.is_visible ? 'active' : 'draft',
        productId: product.id
      }
      
      // Add first image if available
      if (sortedImages.length > 0) {
        const imageUrl = sortedImages[0].url_original || sortedImages[0].url_zoom || sortedImages[0].url_standard
        baseProduct['Image 1'] = imageUrl?.split('?')[0]
      }
      
      tiktokProducts.push(baseProduct)
    })
    
    return NextResponse.json({
      success: true,
      data: tiktokProducts,
      pagination: data.meta?.pagination || {},
      totalProducts: products.length,
      totalTikTokProducts: tiktokProducts.length
    })
  } catch (error) {
    console.error('Error fetching TikTok products:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}