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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id } = body

    console.log("=== TESTING MODIFIER APPLICATION ===")
    console.log("Product ID:", product_id)
    console.log("API URL:", API_URL)

    // Step 1: Verify the product exists
    console.log("Step 1: Checking if product exists...")
    const productResponse = await fetch(`${API_URL}/catalog/products/${product_id}`, {
      headers,
      cache: "no-store",
    })

    if (!productResponse.ok) {
      const errorText = await productResponse.text()
      return NextResponse.json({
        error: "Product not found",
        product_id,
        status: productResponse.status,
        details: errorText,
      })
    }

    const productData = await productResponse.json()
    console.log("Product found:", productData.data.name)

    // Step 2: Check current modifiers on the product
    console.log("Step 2: Checking current modifiers...")
    const currentModifiersResponse = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers`, {
      headers,
      cache: "no-store",
    })

    let currentModifiers = []
    if (currentModifiersResponse.ok) {
      const currentModifiersData = await currentModifiersResponse.json()
      currentModifiers = currentModifiersData.data || []
      console.log("Current modifiers:", currentModifiers.length)
    }

    // Step 3: Try to create a very simple modifier
    console.log("Step 3: Attempting to create simple text modifier...")
    const simpleModifier = {
      display_name: "Test Text Field",
      type: "text",
      required: false,
    }

    const createResponse = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers`, {
      method: "POST",
      headers,
      body: JSON.stringify(simpleModifier),
    })

    const createResponseText = await createResponse.text()
    console.log("Create response status:", createResponse.status)
    console.log("Create response text:", createResponseText)

    let createResult = null
    let createError = null

    if (createResponse.ok) {
      try {
        createResult = JSON.parse(createResponseText)
        console.log("Successfully created modifier:", createResult.data?.id)
      } catch (parseError) {
        createError = "Success but couldn't parse response"
      }
    } else {
      try {
        createError = JSON.parse(createResponseText)
      } catch (parseError) {
        createError = { message: "Failed to parse error response", raw: createResponseText }
      }
    }

    // Step 4: Check modifiers again after creation attempt
    console.log("Step 4: Checking modifiers after creation attempt...")
    const afterModifiersResponse = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers`, {
      headers,
      cache: "no-store",
    })

    let afterModifiers = []
    if (afterModifiersResponse.ok) {
      const afterModifiersData = await afterModifiersResponse.json()
      afterModifiers = afterModifiersData.data || []
      console.log("Modifiers after creation:", afterModifiers.length)
    }

    return NextResponse.json({
      success: createResponse.ok,
      product: {
        id: productData.data.id,
        name: productData.data.name,
        sku: productData.data.sku,
      },
      test_modifier: simpleModifier,
      current_modifiers_before: currentModifiers,
      current_modifiers_after: afterModifiers,
      create_response: {
        status: createResponse.status,
        success: createResponse.ok,
        data: createResult,
        error: createError,
        raw_response: createResponseText,
      },
      debug_info: {
        api_url: API_URL,
        store_hash: STORE_HASH,
        has_access_token: !!ACCESS_TOKEN,
      },
    })
  } catch (error) {
    console.error("Test failed:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
