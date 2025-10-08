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

// POST endpoint to clear ALL product rules from a specific product
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

    console.log(`🧹 CLEARING PRODUCT RULES: Starting to remove ALL product rules from product ${productId}...`)

    // First, get all existing product rules
    const rules = await getProductRules(parseInt(productId))
    console.log(`📋 Found ${rules.length} product rules for product ${productId}`)

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No product rules found to delete",
        summary: {
          productId: parseInt(productId),
          rulesDeleted: 0
        },
        rules: []
      })
    }

    let deletedRules = 0
    const deletedRulesList = []

    // Delete each rule individually
    for (const rule of rules) {
      console.log(`🗑️ Deleting rule ${rule.id}: ${JSON.stringify(rule, null, 2)}`)
      
      const deleteResult = await deleteProductRule(parseInt(productId), rule.id)
      
      if (deleteResult.success) {
        deletedRules++
        deletedRulesList.push({
          id: rule.id,
          conditions: rule.conditions,
          price_adjuster: rule.price_adjuster,
          weight_adjuster: rule.weight_adjuster
        })
        console.log(`✅ Deleted rule ${rule.id}`)
      } else {
        console.warn(`⚠️ Failed to delete rule ${rule.id}: ${deleteResult.error}`)
      }
    }

    console.log(`✅ Product rules deletion complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total rules found: ${rules.length}`)
    console.log(`   - Rules deleted: ${deletedRules}`)

    return NextResponse.json({
      success: true,
      summary: {
        productId: parseInt(productId),
        totalRulesFound: rules.length,
        rulesDeleted: deletedRules
      },
      deletedRules: deletedRulesList
    })

  } catch (error) {
    console.error('❌ Product rules deletion failed:', error)
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
async function getProductRules(productId: number): Promise<any[]> {
  try {
    console.log(`🔍 Fetching product rules for product ${productId}...`)
    
    const response = await rateLimitedFetch(`${API_URL_V2}/products/${productId}/rules`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📭 No product rules found for product ${productId}`)
        return []
      }
      throw new Error(`Failed to fetch product rules for product ${productId}: ${response.status}`)
    }

    const rules = await response.json()
    console.log(`📋 Raw product rules response:`, JSON.stringify(rules, null, 2))
    
    // v2 API returns array directly, not wrapped in data
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
    console.log(`🗑️ Deleting product rule ${ruleId} from product ${productId}...`)
    
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