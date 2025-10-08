import { NextRequest, NextResponse } from 'next/server'
import { rateLimitedFetch } from '@/lib/bigcommerce/rate-limiter'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL_V2 = `https://api.bigcommerce.com/stores/${STORE_HASH}/v2`

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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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
        modifier_id: null, // Will be filled dynamically
        modifier_value_id: null, // Will be filled dynamically
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

// POST endpoint to add correct pricing rules to a specific product
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("product_id")
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "product_id parameter is required" },
        { status: 400 }
      )
    }

    console.log(`🔧 ADDING PRODUCT RULES: Starting to add correct pricing rules to product ${productId}...`)

    // First, get product modifiers to map modifier names to IDs
    const modifiers = await getProductModifiers(parseInt(productId))
    console.log(`📋 Found ${modifiers.length} modifiers for product ${productId}`)

    // Create modifier mapping
    const modifierMap = new Map()
    const modifierValueMap = new Map()

    for (const modifier of modifiers) {
      modifierMap.set(modifier.display_name, modifier.id)
      console.log(`📝 Modifier: "${modifier.display_name}" -> ID: ${modifier.id}`)
      
      // Get modifier values
      const values = await getModifierValues(parseInt(productId), modifier.id)
      for (const value of values) {
        const key = `${modifier.display_name}:${value.label}`
        modifierValueMap.set(key, value.id)
        console.log(`📝 Value: "${modifier.display_name}: ${value.label}" -> ID: ${value.id}`)
      }
    }

    let rulesAdded = 0
    let rulesSkipped = 0
    const addedRules = []
    const skippedRules = []

    // Add each pricing rule
    for (const ruleTemplate of CORRECT_PRICING_RULES) {
      console.log(`🔍 Processing rule: ${ruleTemplate.name}`)
      
      // Fill in the modifier IDs for this rule
      const rule = JSON.parse(JSON.stringify(ruleTemplate)) // Deep copy
      let canCreateRule = true
      
      for (const condition of rule.conditions) {
        const modifierId = modifierMap.get(condition.modifier_name)
        const valueKey = `${condition.modifier_name}:${condition.modifier_value}`
        const valueId = modifierValueMap.get(valueKey)
        
        if (!modifierId || !valueId) {
          console.warn(`⚠️ Cannot create rule "${ruleTemplate.name}": Missing modifier "${condition.modifier_name}" or value "${condition.modifier_value}"`)
          canCreateRule = false
          skippedRules.push({
            name: ruleTemplate.name,
            reason: `Missing modifier "${condition.modifier_name}" or value "${condition.modifier_value}"`
          })
          break
        }
        
        condition.modifier_id = modifierId
        condition.modifier_value_id = valueId
        
        // Remove the helper fields that aren't part of the API
        delete condition.modifier_name
        delete condition.modifier_value
      }
      
      if (canCreateRule) {
        console.log(`🔧 Creating rule: ${rule.name}`)
        
        // Create clean rule data using v2 API format
        const ruleDataForAPI = {
          conditions: rule.conditions.map((condition: any) => ({
            product_option_id: condition.modifier_id,
            option_value_id: condition.modifier_value_id
          })),
          price_adjuster: {
            adjuster: rule.price_adjuster.adjuster,
            adjuster_value: rule.price_adjuster.adjuster_value
          }
        }
        
        console.log(`📋 Clean rule data for API:`, JSON.stringify(ruleDataForAPI, null, 2))
        
        const createResult = await createProductRule(parseInt(productId), ruleDataForAPI)
        
        if (createResult.success) {
          rulesAdded++
          addedRules.push({
            name: rule.name,
            price_adjustment: rule.price_adjuster.adjuster_value,
            conditions: ruleTemplate.conditions.map(c => `${c.modifier_name}: ${c.modifier_value}`)
          })
          console.log(`✅ Created rule: ${rule.name}`)
        } else {
          console.warn(`⚠️ Failed to create rule "${rule.name}": ${createResult.error}`)
          skippedRules.push({
            name: rule.name,
            reason: createResult.error
          })
        }
      } else {
        rulesSkipped++
      }
    }

    console.log(`✅ Product rules creation complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Rules added: ${rulesAdded}`)
    console.log(`   - Rules skipped: ${rulesSkipped}`)

    return NextResponse.json({
      success: true,
      summary: {
        productId: parseInt(productId),
        rulesAdded,
        rulesSkipped,
        totalRulesAttempted: CORRECT_PRICING_RULES.length
      },
      addedRules,
      skippedRules
    })

  } catch (error) {
    console.error('❌ Product rules creation failed:', error)
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
async function getProductModifiers(productId: number): Promise<any[]> {
  try {
    const response = await rateLimitedFetch(`${API_URL_V2.replace('/v2', '/v3')}/catalog/products/${productId}/modifiers`, {
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
    const response = await rateLimitedFetch(`${API_URL_V2.replace('/v2', '/v3')}/catalog/products/${productId}/modifiers/${modifierId}/values`, {
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
    console.log(`🔧 Creating product rule for product ${productId}...`)
    
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