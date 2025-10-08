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

// GET all modifiers for a specific product
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("product_id")

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const response = await fetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching modifiers:", error)
    return NextResponse.json({ error: "Failed to fetch modifiers" }, { status: 500 })
  }
}

// POST to create a new modifier for a product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id, ...modifierData } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const response = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers`, {
      method: "POST",
      headers,
      body: JSON.stringify(modifierData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating modifier:", error)
    return NextResponse.json({ error: "Failed to create modifier" }, { status: 500 })
  }
}
