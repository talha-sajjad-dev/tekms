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

// POST to apply shared modifiers to multiple products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_ids, shared_modifier_ids } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Product IDs array is required" }, { status: 400 })
    }

    if (!shared_modifier_ids || !Array.isArray(shared_modifier_ids) || shared_modifier_ids.length === 0) {
      return NextResponse.json({ error: "Shared modifier IDs array is required" }, { status: 400 })
    }

    const results = []
    const errors = []

    // Apply shared modifiers to each product
    for (const productId of product_ids) {
      try {
        // Get current product modifiers
        const currentModifiersResponse = await fetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
          headers,
          cache: "no-store",
        })

        let currentModifierIds = []
        if (currentModifiersResponse.ok) {
          const currentData = await currentModifiersResponse.json()
          currentModifierIds = currentData.data?.map((mod: any) => mod.id) || []
        }

        // Combine current modifiers with new shared modifiers
        const allModifierIds = [...new Set([...currentModifierIds, ...shared_modifier_ids])]

        // Update product with combined modifiers
        const updateResponse = await fetch(`${API_URL}/catalog/products/${productId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            modifier_ids: allModifierIds,
          }),
        })

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          errors.push({
            product_id: productId,
            error: errorData,
          })
        } else {
          const data = await updateResponse.json()
          results.push({
            product_id: productId,
            applied_modifiers: shared_modifier_ids,
          })
        }
      } catch (error) {
        errors.push({
          product_id: productId,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: results,
      errors: errors,
      total_processed: product_ids.length,
      successful: results.length,
      failed: errors.length,
    })
  } catch (error) {
    console.error("Error applying shared modifiers:", error)
    return NextResponse.json({ error: "Failed to apply shared modifiers" }, { status: 500 })
  }
}
