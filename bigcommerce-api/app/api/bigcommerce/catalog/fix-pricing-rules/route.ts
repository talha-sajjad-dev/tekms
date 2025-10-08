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
    // NOTE: Small, Medium, Large, X-Large should have NO pricing adjustment
  },
  "Shirt Style": {
    "Women Vneck": 2.00,
    "Women Tanktop": 2.00,
    "Women Long Sleeve": 6.00,
    "Unisex Long Sleeve": 6.00,
    "Unisex Sweatshirts": 6.00,
    "Unisex Hoodie": 10.00
    // NOTE: Basic styles like "Unisex Tshirt" should have NO pricing adjustment
  }
} as const

/**
 * Check if a modifier value should have pricing adjustment
 */
function shouldHavePricing(modifierName: string, valueLabel: string): { shouldHave: boolean; correctPrice?: number } {
  const normalizedModifierName = modifierName.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase()
  const normalizedValueLabel = valueLabel.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase()
  
  // Check each rule category
  for (const [ruleCategory, rules] of Object.entries(CORRECT_MODIFIER_PRICE_RULES)) {
    const normalizedRuleCategory = ruleCategory.toLowerCase().trim()
    
    // Check if modifier matches
    const isModifierMatch = normalizedModifierName === normalizedRuleCategory || 
                           normalizedModifierName.includes(normalizedRuleCategory) ||
                           normalizedRuleCategory.includes(normalizedModifierName)
    
    if (isModifierMatch) {
      // Check if this specific value should have pricing
      for (const [ruleValue, price] of Object.entries(rules)) {
        const normalizedRuleValue = ruleValue.toLowerCase().trim()
        
        const isValueMatch = normalizedValueLabel === normalizedRuleValue ||
                            normalizedValueLabel.includes(normalizedRuleValue) ||
                            normalizedRuleValue.includes(normalizedValueLabel)
        
        if (isValueMatch) {
          return { shouldHave: true, correctPrice: price }
        }
      }
      
      // If modifier matches but value doesn't match any rule, it should NOT have pricing
      return { shouldHave: false }
    }
  }
  
  // If modifier doesn't match any category, it should not have pricing
  return { shouldHave: false }
}

// GET endpoint to analyze current pricing issues
export async function GET() {
  try {
    console.log('🔍 Analyzing current pricing rules for issues...')

    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    const issues = []
    let totalIssues = 0
    let productsWithIssues = 0

    // Analyze each product
    for (const product of products) {
      try {
        const modifiers = await getProductModifiers(product.id)
        const productIssues = []

        for (const modifier of modifiers) {
          // Only check Shirt Size and Shirt Style modifiers
          if (modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style") {
            const values = await getModifierValues(product.id, modifier.id)

            for (const value of values) {
              const currentPrice = value.adjusters?.price?.adjuster_value || 0
              const { shouldHave, correctPrice } = shouldHavePricing(modifier.display_name, value.label)

              // Check for issues
              if (shouldHave && currentPrice !== correctPrice) {
                // Should have pricing but wrong amount or missing
                productIssues.push({
                  type: 'incorrect_pricing',
                  modifier: modifier.display_name,
                  value: value.label,
                  currentPrice,
                  correctPrice,
                  issue: `Should be $${correctPrice} but is $${currentPrice}`
                })
                totalIssues++
              } else if (!shouldHave && currentPrice > 0) {
                // Should NOT have pricing but does
                productIssues.push({
                  type: 'unwanted_pricing',
                  modifier: modifier.display_name,
                  value: value.label,
                  currentPrice,
                  correctPrice: 0,
                  issue: `Should have NO pricing but has $${currentPrice}`
                })
                totalIssues++
              }
            }
          }
        }

        if (productIssues.length > 0) {
          productsWithIssues++
          issues.push({
            productId: product.id,
            productName: product.name,
            issues: productIssues
          })
        }

        // Log progress every 50 products
        if (issues.length % 50 === 0 && issues.length > 0) {
          console.log(`📊 Analysis progress: ${issues.length} products with issues found`)
        }

      } catch (error) {
        console.warn(`Error analyzing product ${product.id}:`, error)
      }
    }

    console.log('📊 Analysis complete!')
    console.log(`   - Total products: ${products.length}`)
    console.log(`   - Products with pricing issues: ${productsWithIssues}`)
    console.log(`   - Total pricing issues: ${totalIssues}`)

    return NextResponse.json({
      success: true,
      analysis: {
        totalProducts: products.length,
        productsWithIssues,
        totalIssues,
        estimatedApiCalls: totalIssues * 2, // Remove + Add for each issue
        estimatedTimeHours: Math.ceil((totalIssues * 2) / 3600)
      },
      correctRules: CORRECT_MODIFIER_PRICE_RULES,
      issues: issues.slice(0, 20), // Show first 20 products with issues
      summary: {
        incorrectPricing: issues.reduce((sum, p) => sum + p.issues.filter(i => i.type === 'incorrect_pricing').length, 0),
        unwantedPricing: issues.reduce((sum, p) => sum + p.issues.filter(i => i.type === 'unwanted_pricing').length, 0)
      }
    })

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint to fix pricing rules
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get("dry_run") === "true"
    
    console.log(`🔧 Starting pricing rules fix... (Dry Run: ${dryRun})`)

    const products = await getAllProducts()
    console.log(`📦 Found ${products.length} products in catalog`)

    let fixedIssues = 0
    let removedIncorrectPricing = 0
    let addedCorrectPricing = 0
    let totalProductsProcessed = 0
    const results = []

    // Process each product
    for (const product of products) {
      try {
        totalProductsProcessed++
        console.log(`🔍 Processing product ${totalProductsProcessed}/${products.length}: ${product.name} (ID: ${product.id})`)
        
        const modifiers = await getProductModifiers(product.id)
        let productFixed = false
        const productFixes = []

        for (const modifier of modifiers) {
          // Only process Shirt Size and Shirt Style modifiers
          if (modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style") {
            const values = await getModifierValues(product.id, modifier.id)

            for (const value of values) {
              const currentPrice = value.adjusters?.price?.adjuster_value || 0
              const { shouldHave, correctPrice } = shouldHavePricing(modifier.display_name, value.label)

              let needsUpdate = false
              let action = ''

              if (shouldHave && currentPrice !== correctPrice) {
                // Should have pricing but wrong amount or missing
                needsUpdate = true
                action = `Set correct pricing: $${correctPrice}`
                addedCorrectPricing++
              } else if (!shouldHave && currentPrice > 0) {
                // Should NOT have pricing but does - remove it
                needsUpdate = true
                action = `Remove incorrect pricing: $${currentPrice} → $0`
                removedIncorrectPricing++
              }

              if (needsUpdate) {
                console.log(`🔧 ${action} for "${modifier.display_name}: ${value.label}"`)
                
                if (!dryRun) {
                  // Update the modifier value
                  const updateResult = await updateModifierValue(product.id, modifier.id, value.id, {
                    ...value,
                    adjusters: shouldHave ? {
                      price: {
                        adjuster: "relative",
                        adjuster_value: correctPrice
                      }
                    } : null // Remove pricing adjuster
                  })

                  if (updateResult.success) {
                    fixedIssues++
                    productFixed = true
                    console.log(`✅ Fixed: ${action}`)
                  } else {
                    console.warn(`⚠️ Failed to fix "${value.label}": ${updateResult.error}`)
                  }
                } else {
                  console.log(`🔍 DRY RUN: Would ${action}`)
                  fixedIssues++
                  productFixed = true
                }

                productFixes.push({
                  modifier: modifier.display_name,
                  value: value.label,
                  action,
                  currentPrice,
                  newPrice: shouldHave ? correctPrice : 0
                })
              }
            }
          }
        }

        if (productFixed) {
          results.push({
            productId: product.id,
            productName: product.name,
            fixes: productFixes
          })
        }

        // Log progress every 10 products
        if (totalProductsProcessed % 10 === 0) {
          console.log(`📊 Progress: ${totalProductsProcessed}/${products.length} products processed, ${fixedIssues} issues fixed`)
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error)
      }
    }

    console.log(`✅ Pricing rules fix complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total products processed: ${totalProductsProcessed}`)
    console.log(`   - Issues fixed: ${fixedIssues}`)
    console.log(`   - Incorrect pricing removed: ${removedIncorrectPricing}`)
    console.log(`   - Correct pricing added: ${addedCorrectPricing}`)

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalProductsProcessed,
        issuesFixed: fixedIssues,
        incorrectPricingRemoved: removedIncorrectPricing,
        correctPricingAdded: addedCorrectPricing,
        productsFixed: results.length
      },
      results: results.slice(0, 50) // Show first 50 fixed products
    })

  } catch (error) {
    console.error('❌ Pricing rules fix failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Helper functions (reuse from existing file)
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