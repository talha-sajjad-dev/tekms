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

// GET all modifiers for product 6013
export async function GET() {
  try {
    console.log("=== FETCHING MODIFIERS FROM PRODUCT 6013 ===")

    const response = await fetch(`${API_URL}/catalog/products/6013/modifiers`, {
      headers,
      cache: "no-store",
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response:", errorText)
      throw new Error(`BigCommerce API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("Modifiers data:", JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      product_id: 6013,
      modifiers: data.data || [],
      total_modifiers: data.data?.length || 0,
      raw_response: data,
    })
  } catch (error) {
    console.error("Error fetching modifiers from product 6013:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch modifiers from product 6013",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
