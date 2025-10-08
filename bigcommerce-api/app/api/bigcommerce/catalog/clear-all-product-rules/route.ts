import { NextRequest, NextResponse } from 'next/server'
import { rateLimitedFetch, logRateLimitStatus } from '@/lib/bigcommerce/rate-limiter'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL_V2 = `https://api.bigcommerce.com/stores/${STORE_HASH}/v2`
const API_URL_V3 = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

// POST endpoint to clear ALL product rules from ALL products
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get("test") === "true"
    
    console.log(`🧹 CLEARING ALL PRODUCT RULES: Starting to remove ALL product rules from ${testMode ? 'TEST PRODUCTS' : 'ALL PRODUCTS'}...`)

    // Get all products
    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let totalProductsProcessed = 0
    let totalRulesDeleted = 0
    let productsWithRules = 0
    const results = []

    // Process each product (limit to first 10 in test mode)
    const productsToProcess = testMode ? products.slice(0, 10) : products

    for (const product of productsToProcess) {
      try {
        totalProductsProcessed++
        console.log(`🔍 Processing product ${totalProductsProcessed}/${productsToProcess.length}: ${product.name} (ID: ${product.id})`)
        
        // Get product rules
        const rules = await getProductRules(product.id)
        console.log(`📋 Found ${rules.length} rules for product ${product.id}`)

        if (rules.length > 0) {
          productsWithRules++
          let deletedRulesForProduct = 0

          // Delete each rule
          for (const rule of rules) {
            console.log(`🗑️ Deleting rule ${rule.id} from product ${product.id}`)
            
            const deleteResult = await deleteProductRule(product.id, rule.id)
            
            if (deleteResult.success) {
              deletedRulesForProduct++
              totalRulesDeleted++
              console.log(`✅ Deleted rule ${rule.id}`)
            } else {
              console.warn(`⚠️ Failed to delete rule ${rule.id}: ${deleteResult.error}`)
            }
          }

          results.push({
            productId: product.id,
            productName: product.name,
            rulesFound: rules.length,
            rulesDeleted: deletedRulesForProduct
          })
        }

        // Log progress every 50 products
        if (totalProductsProcessed % 50 === 0) {
          console.log(`📊 Progress: ${totalProductsProcessed}/${productsToProcess.length} products processed, ${totalRulesDeleted} rules deleted`)
          logRateLimitStatus()
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error)
      }
    }

    console.log(`✅ Product rules clearing complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total products processed: ${totalProductsProcessed}`)
    console.log(`   - Products with rules: ${productsWithRules}`)
    console.log(`   - Total rules deleted: ${totalRulesDeleted}`)

    return NextResponse.json({
      success: true,
      summary: {
        totalProductsProcessed,
        productsWithRules,
        totalRulesDeleted,
        testMode
      },
      results: results.slice(0, 100) // Show first 100 products with rules
    })

  } catch (error) {
    console.error('❌ Product rules clearing failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Helper functions
async function getAllProducts(): Promise<any[]> {
  const allProducts = []
  let page = 1
  const limit = 50

  console.log('📦 Fetching all products with rate limiting...')
  logRateLimitStatus()

  while (true) {
    console.log(`🔄 Fetching products page ${page}...`)
    
    const response = await rateLimitedFetch(`${API_URL_V3}/catalog/products?page=${page}&limit=${limit}`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products page ${page}: ${response.status}`)
    }

    const data = await response.json()
    const products = data.data || []
    
    allProducts.push(...products)
    
    if (products.length < limit) {
      break
    }
    
    page++
    
    if (page % 10 === 0) {
      logRateLimitStatus()
    }
  }

  console.log(`✅ Fetched ${allProducts.length} products total`)
  return allProducts
}

async function getProductRules(productId: number): Promise<any[]> {
  try {
    console.log(`🔍 Fetching product rules for product ${productId}...`)
    
    const response = await rateLimitedFetch(`${API_URL_V2}/products/${productId}/rules`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to fetch product rules for product ${productId}: ${response.status}`)
    }

    const rules = await response.json()
    return Array.isArray(rules) ? rules : []
  } catch (error) {
    console.warn(`Error fetching product rules for product ${productId}:`, error)
    return []
  }
}

async function deleteProductRule(productId: number, ruleId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const response = await rateLimitedFetch(`${API_URL_V2}/products/${productId}/rules/${ruleId}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}