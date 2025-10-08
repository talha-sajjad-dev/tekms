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

// CORRECT pricing rules - only these should have pricing adjustments
const CORRECT_MODIFIER_PRICE_RULES = {
  "Shirt Size": {
    "2X-Large": 4.00,
    "3X-Large": 6.00
    // All other sizes (Small, Medium, Large, X-Large) should have NO pricing
  },
  "Shirt Style": {
    "Women Vneck": 2.00,
    "Women Tanktop": 2.00,
    "Women Long Sleeve": 6.00,
    "Unisex Long Sleeve": 6.00,
    "Unisex Sweatshirts": 6.00,
    "Unisex Hoodie": 10.00
    // All other styles should have NO pricing
  }
} as const

/**
 * Check if a modifier value should have pricing adjustment
 */
function getCorrectPricing(modifierName: string, valueLabel: string): { shouldHave: boolean; correctPrice?: number } {
  // Keep special characters for proper matching (X, -, etc.)
  const normalizedModifierName = modifierName.trim().toLowerCase()
  const normalizedValueLabel = valueLabel.trim().toLowerCase()
  
  console.log(`🔍 getCorrectPricing: "${modifierName}" (normalized: "${normalizedModifierName}") with value: "${valueLabel}" (normalized: "${normalizedValueLabel}")`)
  
  // Check each rule category
  for (const [ruleCategory, rules] of Object.entries(CORRECT_MODIFIER_PRICE_RULES)) {
    const normalizedRuleCategory = ruleCategory.toLowerCase().trim()
    
    console.log(`📋 Checking against rule category: "${ruleCategory}" (normalized: "${normalizedRuleCategory}")`)
    
    // Check if modifier matches
    const isModifierMatch = normalizedModifierName === normalizedRuleCategory ||
                           normalizedModifierName.includes(normalizedRuleCategory) ||
                           normalizedRuleCategory.includes(normalizedModifierName)
    
    console.log(`🔍 Modifier match check: ${isModifierMatch}`)
    
    if (isModifierMatch) {
      console.log(`✅ Modifier "${modifierName}" matches rule category "${ruleCategory}"`)
      
      // Check if this specific value should have pricing
      for (const [ruleValue, price] of Object.entries(rules)) {
        const normalizedRuleValue = ruleValue.toLowerCase().trim()
        
        console.log(`🔍 Checking value "${valueLabel}" against rule "${ruleValue}" (normalized: "${normalizedRuleValue}")`)
        
        // Use exact match only to prevent "Large" matching "2X-Large" or "3X-Large"
        const isValueMatch = normalizedValueLabel === normalizedRuleValue
        
        console.log(`🔍 Value match check: ${isValueMatch}`)
        
        if (isValueMatch) {
          console.log(`💰 MATCH FOUND: "${valueLabel}" matches rule "${ruleValue}" with price +$${price}`)
          return { shouldHave: true, correctPrice: price }
        }
      }
      
      // If modifier matches but value doesn't match any rule, it should NOT have pricing
      console.log(`⚠️ No price rule found for value "${valueLabel}" in category "${ruleCategory}" - should be FREE`)
      return { shouldHave: false }
    }
  }
  
  // If modifier doesn't match any category, it should not have pricing
  console.log(`❌ No matching rule category found for modifier "${modifierName}" - should be FREE`)
  return { shouldHave: false }
}

// POST endpoint to apply correct pricing rules to ALL products
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testProductId = searchParams.get("test_product")
    
    if (testProductId) {
      console.log(`🧪 TESTING: Starting to apply correct pricing rules to product ${testProductId} only...`)
    } else {
      console.log('🔧 Starting to apply correct pricing rules to ALL products...')
    }

    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let totalProductsProcessed = 0
    let totalUpdates = 0
    let removedIncorrectPricing = 0
    let addedCorrectPricing = 0
    let productsFixed = 0
    const results = []

    // Process each product
    for (const product of products) {
      // If testing mode, only process the specified product
      if (testProductId && product.id !== parseInt(testProductId)) {
        continue
      }
      
      try {
        totalProductsProcessed++
        console.log(`🔍 TESTING: Processing product ${totalProductsProcessed}/${products.length}: ${product.name} (ID: ${product.id})`)
        
        const modifiers = await getProductModifiers(product.id)
        let productFixed = false
        const productUpdates = []

        console.log(`📋 Found ${modifiers.length} modifiers for product ${product.id}`)
        
        for (const modifier of modifiers) {
          console.log(`🔍 Checking modifier: "${modifier.display_name}" (Type: ${modifier.type})`)
          
          // Only process Shirt Size and Shirt Style modifiers
          if (modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style") {
            console.log(`✅ Processing target modifier: ${modifier.display_name}`)
            const values = await getModifierValues(product.id, modifier.id)
            console.log(`📝 Found ${values.length} values for modifier ${modifier.display_name}`)

            for (const value of values) {
              const currentPrice = value.adjusters?.price?.adjuster_value || 0
              console.log(`🔍 Checking value: "${value.label}" (Current price: $${currentPrice})`)
              
              const { shouldHave, correctPrice } = getCorrectPricing(modifier.display_name, value.label)
              console.log(`📊 Analysis for "${value.label}": shouldHave=${shouldHave}, correctPrice=${correctPrice}`)

              let needsUpdate = false
              let action = ''
              let newPrice = 0

              if (shouldHave && correctPrice !== undefined) {
                // Should have pricing - set correct price regardless of current state
                newPrice = correctPrice
                if (currentPrice !== correctPrice) {
                  needsUpdate = true
                  action = `Set correct pricing: $${correctPrice}`
                  console.log(`💰 NEEDS UPDATE: "${value.label}" should have $${correctPrice} but has $${currentPrice}`)
                  if (currentPrice === 0) {
                    addedCorrectPricing++
                  } else {
                    addedCorrectPricing++
                    removedIncorrectPricing++
                  }
                } else {
                  console.log(`✓ Already correct: "${value.label}" has correct price $${correctPrice}`)
                }
              } else {
                // Should NOT have pricing - remove any existing pricing
                newPrice = 0
                if (currentPrice > 0) {
                  needsUpdate = true
                  action = `Remove incorrect pricing: $${currentPrice} → $0`
                  console.log(`🚫 NEEDS UPDATE: "${value.label}" should be FREE but has $${currentPrice}`)
                  removedIncorrectPricing++
                } else {
                  console.log(`✓ Already correct: "${value.label}" is FREE as expected - SKIPPING UPDATE`)
                  needsUpdate = false // Explicitly don't update if already correct
                }
              }

              if (needsUpdate) {
                console.log(`🔧 ${action} for "${modifier.display_name}: ${value.label}"`)
                
                // Update the modifier value
                const updateData = { ...value }
                
                if (shouldHave) {
                  // Add pricing adjuster
                  updateData.adjusters = [
                    {
                      price: {
                        adjuster: "relative",
                        adjuster_value: correctPrice
                      }
                    }
                  ]
                } else {
                  // Completely remove adjusters property to ensure no pricing
                  delete updateData.adjusters
                }
                
                const updateResult = await updateModifierValue(product.id, modifier.id, value.id, updateData)

                if (updateResult.success) {
                  totalUpdates++
                  productFixed = true
                  console.log(`✅ Fixed: ${action}`)
                } else {
                  console.warn(`⚠️ Failed to fix "${value.label}": ${updateResult.error}`)
                }

                productUpdates.push({
                  modifier: modifier.display_name,
                  value: value.label,
                  action,
                  oldPrice: currentPrice,
                  newPrice
                })
              } else {
                console.log(`⏭️ No update needed for "${value.label}"`)
              }
            }
          } else {
            console.log(`⏭️ Skipping non-target modifier: ${modifier.display_name}`)
          }
        }

        if (productFixed) {
          productsFixed++
          results.push({
            productId: product.id,
            productName: product.name,
            updates: productUpdates
          })
        }

        // Log progress every 10 products
        if (totalProductsProcessed % 10 === 0) {
          console.log(`📊 Progress: ${totalProductsProcessed}/${products.length} products processed, ${totalUpdates} updates applied`)
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error)
      }
    }

    console.log(`✅ Pricing rules application complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total products processed: ${totalProductsProcessed}`)
    console.log(`   - Total updates applied: ${totalUpdates}`)
    console.log(`   - Incorrect pricing removed: ${removedIncorrectPricing}`)
    console.log(`   - Correct pricing added: ${addedCorrectPricing}`)
    console.log(`   - Products fixed: ${productsFixed}`)

    return NextResponse.json({
      success: true,
      summary: {
        totalProductsProcessed,
        totalUpdates,
        incorrectPricingRemoved: removedIncorrectPricing,
        correctPricingAdded: addedCorrectPricing,
        productsFixed,
        correctRulesApplied: CORRECT_MODIFIER_PRICE_RULES
      },
      results: results.slice(0, 50) // Show first 50 fixed products
    })

  } catch (error) {
    console.error('❌ Pricing rules application failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to show what rules will be applied
export async function GET() {
  return NextResponse.json({
    message: "Use POST to apply correct pricing rules to all products",
    correctRules: CORRECT_MODIFIER_PRICE_RULES,
    whatWillHappen: {
      "Shirt Size": {
        "Small, Medium, Large, X-Large": "Will have NO pricing (free)",
        "2X-Large": "Will have +$4.00 pricing",
        "3X-Large": "Will have +$6.00 pricing"
      },
      "Shirt Style": {
        "Basic styles (Unisex Tshirt, etc.)": "Will have NO pricing (free)",
        "Women Vneck, Women Tanktop": "Will have +$2.00 pricing",
        "Long Sleeve styles": "Will have +$6.00 pricing",
        "Unisex Hoodie": "Will have +$10.00 pricing"
      }
    }
  })
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
    const response = await rateLimitedFetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
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
    const response = await rateLimitedFetch(`${API_URL}/catalog/products/${productId}/modifiers/${modifierId}/values`, {
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