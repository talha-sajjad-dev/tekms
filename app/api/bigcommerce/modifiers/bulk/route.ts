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

// POST to add modifiers to multiple products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_ids, modifier } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Product IDs array is required" }, { status: 400 })
    }

    if (!modifier) {
      return NextResponse.json({ error: "Modifier data is required" }, { status: 400 })
    }

    console.log("=== BULK MODIFIER APPLICATION ===")
    console.log("Product IDs:", product_ids)
    console.log("Modifier:", JSON.stringify(modifier, null, 2))
    console.log("API URL:", API_URL)

    // Convert option values to BigCommerce format if needed
    const processedModifier = { ...modifier }

    // If this is a dropdown, radio, or rectangles type with option_values
    if (["dropdown", "radio_buttons", "rectangles"].includes(modifier.type) && Array.isArray(modifier.option_values)) {
      // Convert to BigCommerce expected format
      processedModifier.option_values = modifier.option_values.map((option: any, index: number) => {
        // If the option is already in the correct format, use it as is
        if (option.sort_order !== undefined && option.value_data !== undefined) {
          return option
        }

        // Otherwise convert from our format to BigCommerce format
        return {
          label: option.label,
          sort_order: index,
          value_data:
            option.price_adjustment !== undefined
              ? {
                  price_adjustment: option.price_adjustment,
                }
              : null,
          is_default: option.is_default || false,
        }
      })
    }

    console.log("Processed modifier:", JSON.stringify(processedModifier, null, 2))

    const results = []
    const errors = []
    let processedCount = 0

    // Add modifier to each product
    for (const productId of product_ids) {
      processedCount++
      console.log(`Processing product ${processedCount}/${product_ids.length}: ${productId}`)

      try {
        const url = `${API_URL}/catalog/products/${productId}/modifiers`
        console.log(`Making request to: ${url}`)
        console.log(`Request body: ${JSON.stringify(processedModifier)}`)

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(processedModifier),
        })

        console.log(`Product ${productId} response status:`, response.status)
        console.log(`Product ${productId} response headers:`, Object.fromEntries(response.headers.entries()))

        // Get response text first to handle empty responses
        const responseText = await response.text()
        console.log(`Product ${productId} response text:`, responseText)

        if (!response.ok) {
          let errorData
          try {
            errorData = responseText ? JSON.parse(responseText) : { message: "Empty response" }
          } catch (parseError) {
            errorData = { message: "Invalid JSON response", raw: responseText }
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
            raw_response: responseText,
          })
        }
      } catch (error) {
        console.error(`Product ${productId} exception:`, error)
        errors.push({
          product_id: productId,
          error: error instanceof Error ? error.message : "Unknown error",
          type: "exception",
          stack: error instanceof Error ? error.stack : undefined,
        })
      }
    }

    console.log("=== BULK APPLICATION COMPLETE ===")
    console.log(`Successful: ${results.length}`)
    console.log(`Failed: ${errors.length}`)

    return NextResponse.json({
      success: results,
      errors: errors,
      total_processed: product_ids.length,
      successful: results.length,
      failed: errors.length,
      summary: {
        success_rate: `${Math.round((results.length / product_ids.length) * 100)}%`,
        modifier_name: modifier.display_name,
        modifier_type: modifier.type,
      },
      debug_info: {
        api_url: API_URL,
        store_hash: STORE_HASH,
        has_access_token: !!ACCESS_TOKEN,
        access_token_preview: ACCESS_TOKEN ? `${ACCESS_TOKEN.substring(0, 8)}...` : "Missing",
      },
    })
  } catch (error) {
    console.error("Error adding bulk modifiers:", error)
    return NextResponse.json(
      {
        error: "Failed to add bulk modifiers",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
