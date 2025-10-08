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
    const { searchParams } = new URL(request.url)
    const forceUpdate = searchParams.get("force") === "true"
    
    console.log(`🔄 Starting catalog-wide pricing rules update... (Force: ${forceUpdate})`)

    // Step 1: Get all products
    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let updatedProductsCount = 0
    let updatedModifiersCount = 0
    let forceUpdatesCount = 0
    let regularUpdatesCount = 0
    let totalProductsProcessed = 0
    let productsWithTargetModifiers = 0
    const results = []

    // Step 2: Process each product
    for (const product of products) {
      try {
        totalProductsProcessed++
        console.log(`🔍 Processing product ${totalProductsProcessed}/${products.length}: ${product.name} (ID: ${product.id})`)
        
        // Get product modifiers
        const modifiers = await getProductModifiers(product.id)
        
        if (modifiers.length === 0) {
          console.log(`⏭️ No modifiers found for product ${product.id}`)
          continue
        }

        let productUpdated = false
        let productHasTargetModifiers = false

        // Step 3: Process each modifier
        for (const modifier of modifiers) {
          // Check if this is a target modifier (Shirt Size or Shirt Style)
          const isTargetModifier = modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style"
          if (isTargetModifier) {
            productHasTargetModifiers = true
          }
          
          console.log(`📋 Checking modifier: ${modifier.display_name} (Type: ${modifier.type})`)
          
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
              
              // Force update logic: update if force=true OR if pricing is different
              const shouldUpdate = forceUpdate || (currentAdjuster !== priceAdjustment)
              
              if (shouldUpdate) {
                if (forceUpdate && currentAdjuster === priceAdjustment) {
                  console.log(`🔄 FORCE UPDATE: "${value.label}" → $${priceAdjustment} (was already correct)`)
                  forceUpdatesCount++
                } else {
                  console.log(`💰 REGULAR UPDATE: "${value.label}": $${currentAdjuster || 0} → $${priceAdjustment}`)
                  regularUpdatesCount++
                }
                
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
            productUpdated = true // Mark product as updated if any modifier was updated
          }
        }

        if (productHasTargetModifiers) {
          productsWithTargetModifiers++
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

        // Log progress every 10 products
        if (totalProductsProcessed % 10 === 0) {
          console.log(`📊 Progress: ${totalProductsProcessed}/${products.length} products processed`)
          console.log(`📈 Stats: ${productsWithTargetModifiers} with target modifiers, ${updatedModifiersCount} modifiers updated`)
        }

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

    console.log(`✅ Catalog update complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total products: ${products.length}`)
    console.log(`   - Products with target modifiers: ${productsWithTargetModifiers}`)
    console.log(`   - Products updated: ${updatedProductsCount}`)
    console.log(`   - Modifiers updated: ${updatedModifiersCount}`)
    console.log(`   - Force updates: ${forceUpdatesCount}`)
    console.log(`   - Regular updates: ${regularUpdatesCount}`)

    return NextResponse.json({
      success: true,
      forceUpdate,
      summary: {
        totalProducts: products.length,
        productsWithTargetModifiers,
        updatedProducts: updatedProductsCount,
        updatedModifiers: updatedModifiersCount,
        forceUpdates: forceUpdatesCount,
        regularUpdates: regularUpdatesCount,
        successRate: `${Math.round((updatedProductsCount / productsWithTargetModifiers) * 100)}%`
      },
      results
    })

  } catch (error) {
    console.error('❌ Catalog pricing rules update failed:', error)
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
  try {
    console.log('📊 Analyzing catalog for pricing rules...')

    // Get all products
    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let productsWithTargetModifiers = 0
    let modifiersNeedingPricing = 0
    let totalModifierValues = 0
    const analysisResults = []

    // Analyze each product
    for (const product of products) {
      try {
        const modifiers = await getProductModifiers(product.id)
        let productHasTargetModifiers = false
        let productModifiersNeedingPricing = 0

        for (const modifier of modifiers) {
          // Check if this is a target modifier (Shirt Size or Shirt Style)
          if (modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style") {
            productHasTargetModifiers = true
            
            const values = await getModifierValues(product.id, modifier.id)
            totalModifierValues += values.length

            for (const value of values) {
              const priceRule = getPriceAdjuster(modifier.display_name, value.label)
              if (priceRule !== null) {
                productModifiersNeedingPricing++
                modifiersNeedingPricing++
              }
            }
          }
        }

        if (productHasTargetModifiers) {
          productsWithTargetModifiers++
          analysisResults.push({
            productId: product.id,
            productName: product.name,
            modifiersNeedingPricing: productModifiersNeedingPricing
          })
        }

        // Log progress every 50 products
        if (analysisResults.length % 50 === 0 && analysisResults.length > 0) {
          console.log(`📊 Analysis progress: ${analysisResults.length} products with target modifiers found`)
        }

      } catch (error) {
        console.warn(`Error analyzing product ${product.id}:`, error)
      }
    }

    const estimatedApiCalls = modifiersNeedingPricing * 3 // Get + Check + Update
    const estimatedTimeHours = Math.ceil(estimatedApiCalls / 3600) // 1 call per second

    console.log('📊 Analysis complete!')
    console.log(`   - Total products: ${products.length}`)
    console.log(`   - Products with target modifiers: ${productsWithTargetModifiers}`)
    console.log(`   - Modifier values needing pricing: ${modifiersNeedingPricing}`)
    console.log(`   - Estimated API calls: ${estimatedApiCalls}`)
    console.log(`   - Estimated time: ${estimatedTimeHours} hours`)

    return NextResponse.json({
      success: true,
      analysis: {
        totalProducts: products.length,
        productsWithTargetModifiers,
        modifiersNeedingPricing,
        totalModifierValues,
        estimatedApiCalls,
        estimatedTimeHours
      },
      pricingRules: MODIFIER_PRICE_RULES,
      usage: {
        regularUpdate: "POST /api/bigcommerce/catalog/update-pricing-rules",
        forceUpdate: "POST /api/bigcommerce/catalog/update-pricing-rules?force=true"
      },
      products: analysisResults.slice(0, 10) // Show first 10 products as sample
    })

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: {
          message: "Use POST to update catalog pricing rules",
          rules: MODIFIER_PRICE_RULES
        }
      },
      { status: 500 }
    )
  }
}
