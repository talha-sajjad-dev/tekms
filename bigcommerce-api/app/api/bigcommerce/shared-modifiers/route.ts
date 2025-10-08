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

// GET all shared modifiers (Product Options)
export async function GET() {
  try {
    console.log("=== FETCHING SHARED MODIFIERS ===")
    console.log("API URL:", API_URL)

    // The correct endpoint for shared modifiers is /catalog/products/modifiers
    // But we need to try different approaches since the direct endpoint failed

    // Try approach 1: Get modifiers from the catalog
    console.log("Trying catalog modifiers endpoint...")
    let response = await fetch(`${API_URL}/catalog/modifiers`, {
      headers,
      cache: "no-store",
    })

    console.log("Catalog modifiers response status:", response.status)

    if (!response.ok) {
      console.log("Catalog modifiers failed, trying product options endpoint...")

      // Try approach 2: Product options endpoint (v2 API)
      const v2ApiUrl = `https://api.bigcommerce.com/stores/${STORE_HASH}/v2`
      response = await fetch(`${v2ApiUrl}/options`, {
        headers,
        cache: "no-store",
      })

      console.log("V2 options response status:", response.status)

      if (!response.ok) {
        console.log("V2 options failed, trying option sets...")

        // Try approach 3: Option sets
        response = await fetch(`${v2ApiUrl}/option_sets`, {
          headers,
          cache: "no-store",
        })

        console.log("Option sets response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("All endpoints failed. Last error:", errorText)

          // Return empty result instead of error
          return NextResponse.json({
            data: [],
            total_shared_modifiers: 0,
            message:
              "No shared modifiers found. You may need to create them in BigCommerce Admin under Products > Product Options.",
            endpoints_tried: ["catalog/modifiers", "v2/options", "v2/option_sets"],
          })
        }
      }
    }

    const data = await response.json()
    console.log("Shared modifiers response:", data)

    // Handle different response formats
    let modifiers = []
    if (Array.isArray(data)) {
      modifiers = data
    } else if (data.data && Array.isArray(data.data)) {
      modifiers = data.data
    } else if (data.options && Array.isArray(data.options)) {
      modifiers = data.options
    }

    console.log("Processed modifiers count:", modifiers.length)

    return NextResponse.json({
      data: modifiers,
      total_shared_modifiers: modifiers.length,
      meta: data.meta || {},
      endpoint_used: response.url,
    })
  } catch (error) {
    console.error("=== ERROR FETCHING SHARED MODIFIERS ===")
    console.error("Error:", error)

    // Return empty result instead of error to not break the UI
    return NextResponse.json({
      data: [],
      total_shared_modifiers: 0,
      message:
        "Could not fetch shared modifiers. This might be due to API permissions or the modifiers being stored differently in your BigCommerce setup.",
      error_details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
