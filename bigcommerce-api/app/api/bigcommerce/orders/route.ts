import { NextResponse } from "next/server"

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v2`

// Headers for BigCommerce API requests
const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

// GET all orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "50"
    const page = searchParams.get("page") || "1"
    const status = searchParams.get("status") || ""

    let url = `${API_URL}/orders?limit=${limit}&page=${page}`
    if (status) {
      url += `&status_id=${status}`
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
