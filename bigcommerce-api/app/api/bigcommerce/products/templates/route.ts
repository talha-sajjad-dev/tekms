import { NextRequest, NextResponse } from 'next/server'
import { ProductDuplicator } from '@/lib/bigcommerce/product-duplicator'

export interface TemplateProduct {
  id: number
  name: string
  sku: string
  price: number
  categories: string[]
  hasModifiers: boolean
  imageCount: number
}

export interface TemplatesResponse {
  success: boolean
  products: TemplateProduct[]
  total: number
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching template products for selection...')

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch all available products as templates
    const products = await ProductDuplicator.getTemplateProducts()

    // Filter by search term if provided
    let filteredProducts = products
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.categories.some(cat => cat.toLowerCase().includes(searchLower))
      )
    }

    // Limit results
    const limitedProducts = filteredProducts.slice(0, limit)

    console.log(`✅ Found ${limitedProducts.length} template products`)

    return NextResponse.json({
      success: true,
      products: limitedProducts,
      total: filteredProducts.length
    })

  } catch (error) {
    console.error('❌ Error fetching template products:', error)
    
    return NextResponse.json({
      success: false,
      products: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch template products'
    }, { status: 500 })
  }
}

// POST endpoint to validate a template product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 })
    }

    console.log(`🔍 Validating template product: ${productId}`)

    // Fetch the specific product to validate it exists and get details
    const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
    const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
    const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Token": ACCESS_TOKEN as string,
      Accept: "application/json",
    }

    const response = await fetch(
      `${API_URL}/catalog/products/${productId}?include=images,modifiers,variants`,
      {
        headers,
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Product ${productId} not found or inaccessible`
      }, { status: 404 })
    }

    const data = await response.json()
    const product = data.data

    // Return detailed product information for validation
    const templateInfo = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      description: product.description,
      categories: product.categories || [],
      images: (product.images || []).length,
      modifiers: (product.modifiers || []).length,
      variants: (product.variants || []).length,
      inventory_tracking: product.inventory_tracking,
      is_visible: product.is_visible,
      weight: product.weight,
      brand_id: product.brand_id
    }

    console.log(`✅ Template product validated: ${product.name}`)

    return NextResponse.json({
      success: true,
      product: templateInfo,
      message: 'Template product is valid and ready for duplication'
    })

  } catch (error) {
    console.error('❌ Error validating template product:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate template product'
    }, { status: 500 })
  }
}