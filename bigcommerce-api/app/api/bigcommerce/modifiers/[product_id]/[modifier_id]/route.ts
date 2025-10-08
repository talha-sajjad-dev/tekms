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

// PUT to update a specific modifier
export async function PUT(request: Request, { params }: { params: { product_id: string; modifier_id: string } }) {
  try {
    const { product_id, modifier_id } = params
    const body = await request.json()

    const response = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers/${modifier_id}`, {
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
    console.error(`Error updating modifier ${params.modifier_id}:`, error)
    return NextResponse.json({ error: `Failed to update modifier ${params.modifier_id}` }, { status: 500 })
  }
}

// DELETE a specific modifier
export async function DELETE(request: Request, { params }: { params: { product_id: string; modifier_id: string } }) {
  try {
    const { product_id, modifier_id } = params

    const response = await fetch(`${API_URL}/catalog/products/${product_id}/modifiers/${modifier_id}`, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`Error deleting modifier ${params.modifier_id}:`, error)
    return NextResponse.json({ error: `Failed to delete modifier ${params.modifier_id}` }, { status: 500 })
  }
}
