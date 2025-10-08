import { NextRequest, NextResponse } from 'next/server'
import { rateLimitedFetch } from '@/lib/bigcommerce/rate-limiter'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

// POST endpoint to clear ALL pricing rules from a specific product
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

    console.log(`🧹 CLEARING: Starting to remove ALL pricing rules from product ${productId}...`)

    const modifiers = await getProductModifiers(parseInt(productId))
    console.log(`📋 Found ${modifiers.length} modifiers for product ${productId}`)

    let totalUpdates = 0
    let clearedValues = 0
    const results = []

    for (const modifier of modifiers) {
      console.log(`🔍 Checking modifier: "${modifier.display_name}" (Type: ${modifier.type})`)
      
      // Process ALL modifiers (not just Shirt Size and Shirt Style)
      const values = await getModifierValues(parseInt(productId), modifier.id)
      console.log(`📝 Found ${values.length} values for modifier ${modifier.display_name}`)

      for (const value of values) {
        const currentPrice = value.adjusters?.price?.adjuster_value || 0
        console.log(`🔍 Checking value: "${value.label}" (Current price: $${currentPrice})`)
        
        if (currentPrice > 0 || value.adjusters) {
          console.log(`🧹 CLEARING: Removing pricing from "${modifier.display_name}: ${value.label}" (was $${currentPrice})`)
          
          // Set price adjuster to 0 explicitly
          const updateData = { ...value }
          updateData.adjusters = [{
            price: {
              adjuster: "relative",
              adjuster_value: 0
            }
          }]
          
          console.log(`🔧 Sending update data:`, JSON.stringify(updateData, null, 2))
          
          const updateResult = await updateModifierValue(parseInt(productId), modifier.id, value.id, updateData)

          if (updateResult.success) {
            totalUpdates++
            clearedValues++
            console.log(`✅ Cleared pricing from "${value.label}"`)
            
            // Verify the change by fetching the updated value
            const updatedValues = await getModifierValues(parseInt(productId), modifier.id)
            const updatedValue = updatedValues.find(v => v.id === value.id)
            const newPrice = updatedValue?.adjusters?.price?.adjuster_value || 0
            console.log(`🔍 Verification: "${value.label}" now has price: $${newPrice}`)
          } else {
            console.warn(`⚠️ Failed to clear pricing from "${value.label}": ${updateResult.error}`)
          }

          results.push({
            modifier: modifier.display_name,
            value: value.label,
            action: `Cleared pricing: $${currentPrice} → $0`,
            oldPrice: currentPrice,
            newPrice: 0
          })
        } else {
          console.log(`⏭️ No pricing to clear for "${value.label}"`)
        }
      }
    }

    console.log(`✅ Pricing clearing complete!`)
    console.log(`📊 Final Stats:`)
    console.log(`   - Total updates applied: ${totalUpdates}`)
    console.log(`   - Values cleared: ${clearedValues}`)

    return NextResponse.json({
      success: true,
      summary: {
        productId: parseInt(productId),
        totalUpdates,
        clearedValues
      },
      results
    })

  } catch (error) {
    console.error('❌ Pricing clearing failed:', error)
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