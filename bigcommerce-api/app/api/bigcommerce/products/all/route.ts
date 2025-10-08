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

// GET all products with pagination handling
export async function GET() {
  try {
    console.log("=== FETCHING ALL PRODUCTS ===")
    console.log("API URL:", API_URL)
    console.log("Store Hash:", STORE_HASH)
    console.log("Access Token:", ACCESS_TOKEN ? "Present" : "Missing")

    // First, try to get a small batch of products to test the connection
    const testResponse = await fetch(
      `${API_URL}/catalog/products?limit=10&include_fields=id,name,sku,price,inventory_level,is_visible`,
      {
        headers,
        cache: "no-store",
      },
    )

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error("API connection test failed:", errorText)
      throw new Error(`BigCommerce API error: ${testResponse.status} - ${errorText}`)
    }

    const testData = await testResponse.json()
    console.log(`Connection test successful. Found ${testData.data?.length || 0} products in test batch.`)

    // If test is successful, proceed with fetching all products
    let allProducts: any[] = []
    let page = 1
    let hasMorePages = true
    const limit = 250 // Use max limit for efficiency

    console.log("Starting to fetch all products...")

    while (hasMorePages) {
      console.log(`Fetching page ${page}...`)

      const response = await fetch(
        `${API_URL}/catalog/products?limit=${limit}&page=${page}&include_fields=id,name,sku,price,inventory_level,is_visible`,
        {
          headers,
          cache: "no-store",
        },
      )

      console.log(`Page ${page} response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Page ${page} error:`, errorText)

        // Instead of throwing, we'll break the loop and return what we have so far
        console.log(`Stopping pagination due to error on page ${page}`)
        break
      }

      const data = await response.json()
      console.log(`Page ${page}: Got ${data.data?.length || 0} products`)

      if (data.data && data.data.length > 0) {
        allProducts = [...allProducts, ...data.data]
        console.log(`Total products so far: ${allProducts.length}`)
      }

      // Check if there are more pages
      if (data.meta && data.meta.pagination) {
        const totalPages = Math.ceil(data.meta.pagination.total / data.meta.pagination.per_page)
        hasMorePages = page < totalPages && data.data.length > 0
        console.log(`Total pages: ${totalPages}, Current page: ${page}, Has more: ${hasMorePages}`)
      } else {
        // If no pagination info, assume this is the last page
        hasMorePages = false
        console.log("No pagination info, assuming last page")
      }

      page++

      // Add delay between requests to respect rate limits
      if (hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }

      // Safety check to prevent infinite loops - increased for 1700+ products
      if (page > 50) {
        console.warn("Reached maximum page limit (50), stopping pagination")
        break
      }
    }

    console.log(`=== FINISHED FETCHING ===`)
    console.log(`Total products fetched: ${allProducts.length}`)

    // Even if we have 0 products, return a valid response
    return NextResponse.json({
      data: allProducts,
      meta: {
        pagination: {
          total: allProducts.length,
          count: allProducts.length,
          per_page: limit,
          current_page: 1,
          total_pages: 1,
        },
      },
    })
  } catch (error) {
    console.error("=== ERROR FETCHING PRODUCTS ===")
    console.error("Error:", error)

    // Return a valid response structure even on error
    return NextResponse.json(
      {
        data: [],
        error: "Failed to fetch all products",
        details: error instanceof Error ? error.message : "Unknown error",
        debug_info: {
          api_url: API_URL,
          store_hash: STORE_HASH,
          has_access_token: !!ACCESS_TOKEN,
        },
      },
      { status: 500 },
    )
  }
}
