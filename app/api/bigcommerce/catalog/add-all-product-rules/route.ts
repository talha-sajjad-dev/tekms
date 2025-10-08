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

// CORRECT pricing rules - only these should have pricing adjustments
const CORRECT_PRICING_RULES = [
  {
    name: "2X-Large Size Premium",
    conditions: [
      {
        modifier_name: "Shirt Size",
        modifier_value: "2X-Large"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 4.00
    }
  },
  {
    name: "3X-Large Size Premium", 
    conditions: [
      {
        modifier_name: "Shirt Size",
        modifier_value: "3X-Large"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 6.00
    }
  },
  {
    name: "Women Vneck Premium",
    conditions: [
      {
        modifier_name: "Shirt Style",
        modifier_value: "Women Vneck"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 2.00
    }
  },
  {
    name: "Women Tanktop Premium",
    conditions: [
      {
        modifier_name: "Shirt Style", 
        modifier_value: "Women Tanktop"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 2.00
    }
  },
  {
    name: "Women Long Sleeve Premium",
    conditions: [
      {
        modifier_name: "Shirt Style",
        modifier_value: "Women Long Sleeve"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 6.00
    }
  },
  {
    name: "Unisex Long Sleeve Premium",
    conditions: [
      {
        modifier_name: "Shirt Style",
        modifier_value: "Unisex Long Sleeve"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 6.00
    }
  },
  {
    name: "Unisex Sweatshirts Premium",
    conditions: [
      {
        modifier_name: "Shirt Style",
        modifier_value: "Unisex Sweatshirts"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 6.00
    }
  },
  {
    name: "Unisex Hoodie Premium",
    conditions: [
      {
        modifier_name: "Shirt Style",
        modifier_value: "Unisex Hoodie"
      }
    ],
    price_adjuster: {
      adjuster: "relative",
      adjuster_value: 10.00
    }
  }
]

// POST endpoint to add correct pricing rules to ALL products
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get("test") === "true"
    
    console.log(`🔧 ADDING ALL PRODUCT RULES: Starting to add correct pricing rules to ${testMode ? 'TEST PRODUCTS' : 'ALL PRODUCTS'}...`)

    // Get all products
    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let totalProductsProcessed = 0
    let totalRulesAdded = 0
    let productsWithRulesAdded = 0
    const results = []

    // Process each product (limit to first 10 in test mode)
    const productsToProcess = testMode ? products.slice(0, 10) : products

    for (const product of productsToProcess) {
      try {
        totalProductsProcessed++
        console.log(`🔍 Processing product ${totalProductsProcessed}/${productsToProcess.length}: ${product.name} (ID: ${product.id})`)
        
        // Get product modifiers to map modifier names to IDs
        const modifiers = await getProductModifiers(product.id)
        console.log(`📋 Found ${modifiers.length} modifiers for product ${product.id}`)

        // Create modifier mapping
        const modifierMap = new Map()
        const modifierValueMap = new Map()

        for (const modifier of modifiers) {
          modifierMap.set(modifier.display_name, modifier.id)
          
          // Get modifier values
          const values = await getModifierValues(product.id, modifier.id)
          for (const value of values) {
            const key = `${modifier.display_name}:${value.label}`
            modifierValueMap.set(key, value.id)
          }
        }

        let rulesAddedForProduct = 0
        const productRules = []

        // Add each pricing rule for this product
        for (const ruleTemplate of CORRECT_PRICING_RULES) {
          let canCreateRule = true
          
          // Check if this product has the required modifiers/values
          for (const condition of ruleTemplate.conditions) {
            const modifierId = modifierMap.get(condition.modifier_name)
            const valueKey = `${condition.modifier_name}:${condition.modifier_value}`
            const valueId = modifierValueMap.get(valueKey)
            
            if (!modifierId || !valueId) {
              canCreateRule = false
              break
            }
          }
          
          if (canCreateRule) {
            // Create the rule data
            const ruleDataForAPI = {
              conditions: ruleTemplate.conditions.map((condition: any) => {
                const modifierId = modifierMap.get(condition.modifier_name)
                const valueKey = `${condition.modifier_name}:${condition.modifier_value}`
                const valueId = modifierValueMap.get(valueKey)
                
                return {
                  product_option_id: modifierId,
                  option_value_id: valueId
                }
              }),
              price_adjuster: {
                adjuster: ruleTemplate.price_adjuster.adjuster,
                adjuster_value: ruleTemplate.price_adjuster.adjuster_value
              }
            }
            
            const createResult = await createProductRule(product.id, ruleDataForAPI)
            
            if (createResult.success) {
              rulesAddedForProduct++
              totalRulesAdded++
              productRules.push({
                name: ruleTemplate.name,
                price_adjustment: ruleTemplate.price_adjuster.adjuster_value
              })
            }
          }
        }

        if (rulesAddedForProduct > 0) {
          productsWithRulesAdded++
          results.push({
            productId: product.id,
            productName: product.name,
            rulesAdded: rulesAddedForProduct,
            rules: productRules
          })
        }

        // Log progress every 50 products
        if (totalProductsProcessed % 50 === 0) {
          console.log(`📊 Progress: ${totalProductsProcessed}/${productsToProcess.length} products processed, ${totalRulesAdded} rules added`)
          logRateLimitStatus()
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error)
      }
    }

    console.log(`✅ Product rules addition complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total products processed: ${totalProductsProcessed}`)
    console.log(`   - Products with rules added: ${productsWithRulesAdded}`)
    console.log(`   - Total rules added: ${totalRulesAdded}`)

    return NextResponse.json({
      success: true,
      summary: {
        totalProductsProcessed,
        productsWithRulesAdded,
        totalRulesAdded,
        testMode
      },
      results: results.slice(0, 100) // Show first 100 products with rules
    })

  } catch (error) {
    console.error('❌ Product rules addition failed:', error)
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

async function getProductModifiers(productId: number): Promise<any[]> {
  try {
    const response = await rateLimitedFetch(`${API_URL_V3}/catalog/products/${productId}/modifiers`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to fetch modifiers for product ${productId}: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.warn(`Error fetching modifiers for product ${productId}:`, error)
    return []
  }
}

async function getModifierValues(productId: number, modifierId: number): Promise<any[]> {
  try {
    const response = await rateLimitedFetch(`${API_URL_V3}/catalog/products/${productId}/modifiers/${modifierId}/values`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to fetch modifier values: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.warn(`Error fetching modifier values for product ${productId}, modifier ${modifierId}:`, error)
    return []
  }
}

async function createProductRule(productId: number, ruleData: any): Promise<{
  success: boolean
  error?: string
  ruleId?: number
}> {
  try {
    const response = await rateLimitedFetch(`${API_URL_V2}/products/${productId}/rules`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ruleData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `API error: ${response.status} - ${JSON.stringify(errorData)}`
      }
    }

    const result = await response.json()
    return { 
      success: true, 
      ruleId: result.id 
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}