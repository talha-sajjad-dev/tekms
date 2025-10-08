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

// POST to create a new modifier for a product
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const productId = params.id
    const modifierData = await request.json()

    console.log(`Creating modifier for product ${productId}:`, JSON.stringify(modifierData, null, 2))

    const response = await fetch(`${API_URL}/catalog/products/${productId}/modifiers`, {
      method: "POST",
      headers,
      body: JSON.stringify(modifierData),
    })

    const responseText = await response.text()
    console.log(`Response status: ${response.status}`)
    console.log(`Response text: ${responseText}`)

    if (!response.ok) {
      let errorData
      try {
        errorData = responseText ? JSON.parse(responseText) : { message: "Empty response" }
      } catch (parseError) {
        errorData = { message: "Invalid JSON response", raw: responseText }
      }

      return NextResponse.json(errorData, { status: response.status })
    }

    let data
    try {
      data = responseText ? JSON.parse(responseText) : { message: "Empty success response" }
    } catch (parseError) {
      data = { message: "Success but invalid JSON", raw: responseText }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error creating modifier for product ${params.id}:`, error)
    return NextResponse.json(
      {
        error: `Failed to create modifier for product ${params.id}`,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET all modifiers for a specific product
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

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
    console.error(`Error fetching modifiers for product ${params.id}:`, error)
    return NextResponse.json({ error: `Failed to fetch modifiers for product ${params.id}` }, { status: 500 })
  }
}
