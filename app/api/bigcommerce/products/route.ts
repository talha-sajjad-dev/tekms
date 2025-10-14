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

// GET products with optional limit
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "50"

    console.log("=== FETCHING PRODUCTS ===")
    console.log("Limit:", limit)
    console.log("API URL:", API_URL)

    const response = await fetch(`${API_URL}/catalog/products?limit=${limit}&include=images`, {
      headers,
      cache: "no-store",
    })

    console.log("Products API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Products API error:", errorText)
      throw new Error(`BigCommerce API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("Products found:", data.data?.length || 0)

    return NextResponse.json(data)
  } catch (error) {
    console.error("=== ERROR FETCHING PRODUCTS ===")
    console.error("Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST to create a new product
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_URL}/catalog/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
