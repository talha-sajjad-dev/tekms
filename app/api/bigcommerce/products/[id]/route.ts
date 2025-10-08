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

// GET a specific product
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const response = await fetch(`${API_URL}/catalog/products/${id}`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error fetching product ${params.id}:`, error)
    return NextResponse.json({ error: `Failed to fetch product ${params.id}` }, { status: 500 })
  }
}

// PUT to update a product
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    const response = await fetch(`${API_URL}/catalog/products/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error updating product ${params.id}:`, error)
    return NextResponse.json({ error: `Failed to update product ${params.id}` }, { status: 500 })
  }
}

// DELETE a product
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const response = await fetch(`${API_URL}/catalog/products/${id}`, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`Error deleting product ${params.id}:`, error)
    return NextResponse.json({ error: `Failed to delete product ${params.id}` }, { status: 500 })
  }
}
