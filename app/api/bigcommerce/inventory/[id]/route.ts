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

// PUT to update inventory for a specific product
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    // Update product inventory
    const response = await fetch(`${API_URL}/catalog/products/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        inventory_level: body.inventory_level,
        inventory_warning_level: body.inventory_warning_level,
        inventory_tracking: body.inventory_tracking || "product",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error updating inventory for product ${params.id}:`, error)
    return NextResponse.json({ error: `Failed to update inventory for product ${params.id}` }, { status: 500 })
  }
}
