import { NextRequest, NextResponse } from 'next/server'
import { rateLimitedFetch, logRateLimitStatus } from '@/lib/bigcommerce/rate-limiter'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

// Price adjuster rules for modifiers
const MODIFIER_PRICE_RULES = {
  "Shirt Size": {
    "2X-Large": 4.00,
    "3X-Large": 6.00
  },
  "Shirt Style": {
    "Women Vneck": 2.00,
    "Women Tanktop": 2.00,
    "Women Long Sleeve": 6.00,
    "Unisex Long Sleeve": 6.00,
    "Unisex Sweatshirts": 6.00,
    "Unisex Hoodie": 10.00
  }
} as const

/**
 * Helper function to get price adjuster for a modifier value
 */
function getPriceAdjuster(modifierName: string, valueLabel: string): number | null {
  // Normalize both strings for comparison
  const normalizedModifierName = modifierName.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase()
  const normalizedValueLabel = valueLabel.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase()
  
  console.log(`🔍 Checking modifier: "${modifierName}" (normalized: "${normalizedModifierName}") with value: "${valueLabel}" (normalized: "${normalizedValueLabel}")`)
  
  // Check each rule category
  for (const [ruleCategory, rules] of Object.entries(MODIFIER_PRICE_RULES)) {
    const normalizedRuleCategory = ruleCategory.toLowerCase().trim()
    
    // Use exact match or close match for modifier names
    const isModifierMatch = normalizedModifierName === normalizedRuleCategory || 
                           normalizedModifierName.includes(normalizedRuleCategory) ||
                           normalizedRuleCategory.includes(normalizedModifierName)
    
    if (isModifierMatch) {
      console.log(`✓ Modifier "${modifierName}" matches rule category "${ruleCategory}"`)
      
      // Check if the value label matches any rule
      for (const [ruleValue, price] of Object.entries(rules)) {
        const normalizedRuleValue = ruleValue.toLowerCase().trim()
        
        // Use exact match or contains match for values
        const isValueMatch = normalizedValueLabel === normalizedRuleValue ||
                            normalizedValueLabel.includes(normalizedRuleValue) ||
                            normalizedRuleValue.includes(normalizedValueLabel)
        
        if (isValueMatch) {
          console.log(`💰 Value "${valueLabel}" matches rule "${ruleValue}" with price +$${price}`)
          return price
        }
      }
      
      console.log(`⚠️ No price rule found for value "${valueLabel}" in category "${ruleCategory}"`)
    }
  }
  
  console.log(`❌ No matching price rule found for modifier "${modifierName}" with value "${valueLabel}"`)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { excludeProductIds = [] } = body // List of product IDs to skip

    console.log('🔄 Starting catalog-wide pricing rules update for remaining products...')
    console.log(`🚫 Excluding ${excludeProductIds.length} already processed products`)

    // Step 1: Get all products
    const allProducts = await getAllProducts()
    console.log(`📦 Found ${allProducts.length} total products in catalog`)

    // Filter out already processed products
    const products = allProducts.filter(product => !excludeProductIds.includes(product.id))
    console.log(`🎯 Processing ${products.length} remaining products`)

    let updatedProductsCount = 0
    let updatedModifiersCount = 0
    const results = []

    // Step 2: Process each product
    for (const product of products) {
      try {
        console.log(`🔍 Processing product: ${product.name} (ID: ${product.id})`)
        
        // Get product modifiers
        const modifiers = await getProductModifiers(product.id)
        
        if (modifiers.length === 0) {
          console.log(`⏭️ No modifiers found for product ${product.id}`)
          results.push({
            productId: product.id,
            productName: product.name,
            updated: false,
            modifiersCount: 0,
            reason: 'No modifiers'
          })
          continue
        }

        let productUpdated = false
        let productHasTargetModifiers = false

        // Step 3: Process each modifier
        for (const modifier of modifiers) {
          console.log(`📋 Checking modifier: ${modifier.display_name} (Type: ${modifier.type})`)
          
          // Check if this modifier matches our target categories
          const normalizedModifierName = modifier.display_name.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase()
          const isTargetModifier = normalizedModifierName.includes('shirt size') || 
                                  normalizedModifierName.includes('shirt style') ||
                                  normalizedModifierName === 'shirt size' ||
                                  normalizedModifierName === 'shirt style'

          if (isTargetModifier) {
            productHasTargetModifiers = true
            console.log(`🎯 Found target modifier: ${modifier.display_name}`)
          }
          
          // Get modifier values
          const modifierValues = await getModifierValues(product.id, modifier.id)
          
          if (modifierValues.length === 0) {
            console.log(`⏭️ No values found for modifier ${modifier.id}`)
            continue
          }

          let modifierUpdated = false

          // Step 4: Check each modifier value for pricing rules
          for (const value of modifierValues) {
            const priceAdjustment = getPriceAdjuster(modifier.display_name, value.label)
            
            if (priceAdjustment !== null) {
              // Check if this value already has a price adjuster
              const currentAdjuster = value.adjusters?.price?.adjuster_value
              
              if (currentAdjuster !== priceAdjustment) {
                console.log(`💰 Updating price adjuster for "${value.label}": $${currentAdjuster || 0} → $${priceAdjustment}`)
                
                // Update the modifier value with price adjuster
                const updateResult = await updateModifierValue(product.id, modifier.id, value.id, {
                  ...value,
                  adjusters: [
                    {
                      price: {
                        adjuster: "relative",
                        adjuster_value: priceAdjustment
                      }
                    }
                  ]
                })

                if (updateResult.success) {
                  modifierUpdated = true
                  console.log(`✅ Updated price adjuster for "${value.label}"`)
                } else {
                  console.warn(`⚠️ Failed to update "${value.label}": ${updateResult.error}`)
                }
              } else {
                console.log(`✓ Price adjuster already correct for "${value.label}": $${priceAdjustment}`)
              }
            }
          }

          if (modifierUpdated) {
            updatedModifiersCount++
            productUpdated = true
          }
        }

        if (productUpdated) {
          updatedProductsCount++
        }

        results.push({
          productId: product.id,
          productName: product.name,
          updated: productUpdated,
          modifiersCount: modifiers.length,
          hasTargetModifiers: productHasTargetModifiers,
          reason: !productHasTargetModifiers ? 'No target modifiers (Shirt Size/Style)' : 
                  productUpdated ? 'Updated' : 'No changes needed'
        })

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error)
        results.push({
          productId: product.id,
          productName: product.name,
          updated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Remaining products update complete!`)
    console.log(`📊 Updated ${updatedProductsCount} products with ${updatedModifiersCount} modified modifiers`)

    // Count products with target modifiers
    const productsWithTargetModifiers = results.filter(r => r.hasTargetModifiers).length
    const productsWithoutTargetModifiers = results.filter(r => !r.hasTargetModifiers).length

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessedProducts: products.length,
        totalExcludedProducts: excludeProductIds.length,
        updatedProducts: updatedProductsCount,
        updatedModifiers: updatedModifiersCount,
        productsWithTargetModifiers,
        productsWithoutTargetModifiers
      },
      results
    })

  } catch (error) {
    console.error('❌ Remaining products pricing rules update failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function getAllProducts(): Promise<any[]> {
  const allProducts = []
  let page = 1
  const limit = 50

  console.log('📦 Fetching all products with rate limiting...')
  logRateLimitStatus()

  while (true) {
    console.log(`🔄 Fetching products page ${page}...`)
    
    const response = await rateLimitedFetch(`${API_URL}/catalog/products?page=${page}&limit=${limit}`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products page ${page}: ${response.status}`)
    }

    const data = await response.json()
    const products = data.data || []
    
    allProducts.push(...products)
    
    // Check if we have more pages
    if (products.length < limit) {
      break
    }
    
    page++
    
    // Log rate limit status every 10 pages
    if (page % 10 === 0) {
      logRateLimitStatus()
    }
  }

  console.log(`✅ Fetched ${allProducts.length} products total`)
  return allProducts
}

async function getProductModifiers(productId: number): Promise<any[]> {
  try {
    const response = await rateLimitedFetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return [] // No modifiers found
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
    const response = await rateLimitedFetch(`${API_URL}/catalog/products/${productId}/modifiers/${modifierId}/values`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        return [] // No values found
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

async function updateModifierValue(productId: number, modifierId: number, valueId: number, valueData: any): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const response = await rateLimitedFetch(`${API_URL}/catalog/products/${productId}/modifiers/${modifierId}/values/${valueId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(valueData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `API error: ${response.status} - ${JSON.stringify(errorData)}`
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

export async function GET() {
  return NextResponse.json({
    message: "Use POST to update remaining products pricing rules. Send excludeProductIds array in request body.",
    rules: MODIFIER_PRICE_RULES
  })
}
