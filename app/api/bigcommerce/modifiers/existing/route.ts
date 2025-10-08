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

// GET all existing modifiers across all products
export async function GET() {
  try {
    console.log("Starting to fetch existing modifiers...")
    console.log("API URL:", API_URL)
    console.log("Store Hash:", STORE_HASH)
    console.log("Access Token:", ACCESS_TOKEN ? "Present" : "Missing")

    // First, get all products (limit to first 50 for testing)
    const response = await fetch(`${API_URL}/catalog/products?limit=50&include_fields=id,name`, {
      headers,
      cache: "no-store",
    })

    console.log("Products API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Products API error:", errorText)
      throw new Error(`BigCommerce API error: ${response.status} - ${errorText}`)
    }

    const productsData = await response.json()
    console.log("Products fetched:", productsData.data?.length || 0)

    if (!productsData.data || productsData.data.length === 0) {
      return NextResponse.json({
        data: [],
        total_products_checked: 0,
        unique_modifiers_found: 0,
        message: "No products found",
      })
    }

    // Now get modifiers for each product
    const allModifiers = []
    const modifierMap = new Map() // To track unique modifiers
    let productsWithModifiers = 0

    for (const product of productsData.data.slice(0, 10)) {
      // Limit to first 10 products for testing
      try {
        console.log(`Fetching modifiers for product ${product.id} (${product.name})...`)

        const modifierResponse = await fetch(`${API_URL}/catalog/products/${product.id}/modifiers`, {
          headers,
          cache: "no-store",
        })

        console.log(`Modifiers API response for product ${product.id}:`, modifierResponse.status)

        if (modifierResponse.ok) {
          const modifierData = await modifierResponse.json()
          console.log(`Product ${product.id} has ${modifierData.data?.length || 0} modifiers`)

          if (modifierData.data && modifierData.data.length > 0) {
            productsWithModifiers++

            for (const modifier of modifierData.data) {
              console.log(`Found modifier: ${modifier.display_name} (${modifier.type})`)

              // Create a unique key for the modifier based on its structure
              const modifierKey = `${modifier.display_name}_${modifier.type}_${JSON.stringify(
                modifier.option_values?.map((ov) => ({
                  label: ov.label,
                  value: ov.value,
                  price_adjustment: ov.price_adjustment,
                })) || [],
              )}`

              if (!modifierMap.has(modifierKey)) {
                modifierMap.set(modifierKey, {
                  ...modifier,
                  product_count: 1,
                  sample_product_id: product.id,
                  sample_product_name: product.name,
                  unique_key: modifierKey,
                })
              } else {
                // Increment product count for this modifier
                const existing = modifierMap.get(modifierKey)
                existing.product_count += 1
              }
            }
          }
        } else {
          const errorText = await modifierResponse.text()
          console.error(`Error fetching modifiers for product ${product.id}:`, errorText)
        }
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error)
        // Continue with other products
      }
    }

    // Convert map to array
    const uniqueModifiers = Array.from(modifierMap.values())

    console.log(`Found ${uniqueModifiers.length} unique modifiers across ${productsWithModifiers} products`)

    return NextResponse.json({
      data: uniqueModifiers,
      total_products_checked: productsData.data.length,
      products_with_modifiers: productsWithModifiers,
      unique_modifiers_found: uniqueModifiers.length,
      debug_info: {
        api_url: API_URL,
        store_hash: STORE_HASH,
        has_access_token: !!ACCESS_TOKEN,
      },
    })
  } catch (error) {
    console.error("Error fetching existing modifiers:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch existing modifiers",
        details: error instanceof Error ? error.message : "Unknown error",
        debug_info: {
          api_url: API_URL,
          store_hash: STORE_HASH,
          has_access_token: !!ACCESS_TOKEN,
        },
      },
      { status: 500 },
    )
  }
}
