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

// GET inventory levels for all products
export async function GET() {
  try {
    const response = await fetch(`${API_URL}/catalog/products?include=inventory`, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract inventory information
    const inventoryData = data.data.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      inventory_level: product.inventory_level,
      inventory_warning_level: product.inventory_warning_level,
      inventory_tracking: product.inventory_tracking,
    }))

    return NextResponse.json({ data: inventoryData })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}
