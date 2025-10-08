import { NextResponse } from "next/server"

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

// Headers for BigCommerce API requests
const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

// POST to apply an existing modifier template to multiple products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_ids, modifier_template } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Product IDs array is required" }, { status: 400 })
    }

    if (!modifier_template) {
      return NextResponse.json({ error: "Modifier template is required" }, { status: 400 })
    }

    console.log("=== APPLYING EXISTING MODIFIER ===")
    console.log("Product IDs:", product_ids)
    console.log("Modifier Template:", JSON.stringify(modifier_template, null, 2))

    // Clean the modifier template - remove BigCommerce specific fields that shouldn't be copied
    const cleanModifier = {
      display_name: modifier_template.display_name,
      type: modifier_template.type,
      required: modifier_template.required || false,
    }

    // Handle option values if they exist
    if (modifier_template.option_values && Array.isArray(modifier_template.option_values)) {
      cleanModifier.option_values = modifier_template.option_values.map((option, index) => ({
        label: option.label,
        sort_order: index,
        value_data:
          option.price_adjustment !== 0
            ? {
                price_adjustment: option.price_adjustment,
              }
            : null,
        is_default: option.is_default || false,
      }))
    }

    // Handle config for other modifier types
    if (modifier_template.config) {
      cleanModifier.config = modifier_template.config
    }

    console.log("Clean modifier to apply:", JSON.stringify(cleanModifier, null, 2))

    const results = []
    const errors = []

    // Apply modifier to each product
    for (const productId of product_ids) {
      try {
        console.log(`Applying modifier to product ${productId}...`)

        const response = await fetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
          method: "POST",
          headers,
          body: JSON.stringify(cleanModifier),
        })

        const responseText = await response.text()
        console.log(`Product ${productId} response status:`, response.status)
        console.log(`Product ${productId} response:`, responseText)

        if (!response.ok) {
          let errorData
          try {
            errorData = responseText ? JSON.parse(responseText) : { message: "Empty error response" }
          } catch (parseError) {
            errorData = { message: "Invalid JSON error response", raw: responseText }
          }

          console.error(`Product ${productId} error:`, errorData)
          errors.push({
            product_id: productId,
            error: errorData,
            status: response.status,
            raw_response: responseText,
          })
        } else {
          let data
          try {
            data = responseText ? JSON.parse(responseText) : { message: "Empty success response" }
          } catch (parseError) {
            data = { message: "Success but invalid JSON", raw: responseText }
          }

          console.log(`Product ${productId} success:`, data.data?.id ? `Modifier ID ${data.data.id}` : "Success")
          results.push({
            product_id: productId,
            modifier: data.data,
            modifier_id: data.data?.id,
          })
        }
      } catch (error) {
        console.error(`Product ${productId} exception:`, error)
        errors.push({
          product_id: productId,
          error: error instanceof Error ? error.message : "Unknown error",
          type: "exception",
        })
      }
    }

    console.log("=== APPLICATION COMPLETE ===")
    console.log(`Successful: ${results.length}`)
    console.log(`Failed: ${errors.length}`)

    return NextResponse.json({
      success: results,
      errors: errors,
      total_processed: product_ids.length,
      successful: results.length,
      failed: errors.length,
      modifier_name: modifier_template.display_name,
    })
  } catch (error) {
    console.error("Error applying existing modifier:", error)
    return NextResponse.json(
      {
        error: "Failed to apply existing modifier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
