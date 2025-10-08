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

// Rate limiting configuration for basic users
const RATE_LIMIT_DELAY = 1000 // 1 second between API calls
const BATCH_SIZE = 10 // Process 10 products at a time
const BATCH_DELAY = 5000 // 5 seconds between batches

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// GET endpoint to check products without modifiers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const checkOnly = searchParams.get("check_only") === "true"
    
    console.log("=== CHECKING PRODUCTS WITHOUT MODIFIERS ===")
    
    // Fetch ALL products using pagination
    let allProducts: any[] = []
    let currentPage = 1
    let hasMorePages = true
    
    while (hasMorePages) {
      const productsResponse = await fetch(
        `${API_URL}/catalog/products?limit=250&page=${currentPage}`,
        {
          headers,
          cache: "no-store",
        }
      )
      
      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`)
      }
      
      const productsData = await productsResponse.json()
      const products = productsData.data || []
      
      allProducts = [...allProducts, ...products]
      
      // Check if there are more pages
      const totalPages = productsData.meta?.pagination?.total_pages || 1
      hasMorePages = currentPage < totalPages
      currentPage++
      
      console.log(`Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`)
      
      // Rate limiting between page fetches
      if (hasMorePages) {
        await delay(RATE_LIMIT_DELAY)
      }
    }
    
    const products = allProducts
    console.log(`Found ${products.length} total products across all pages`)
    
    // Check each product for modifiers
    const productsWithoutModifiers = []
    const productsWithModifiers = []
    let checkedCount = 0
    
    for (const product of products) {
      checkedCount++
      
      // Rate limiting - delay between each check
      if (checkedCount > 1) {
        await delay(RATE_LIMIT_DELAY)
      }
      
      try {
        const modifiersResponse = await fetch(
          `${API_URL}/catalog/products/${product.id}/modifiers`,
          {
            headers,
            cache: "no-store",
          }
        )
        
        if (modifiersResponse.ok) {
          const modifiersData = await modifiersResponse.json()
          const modifiers = modifiersData.data || []
          
          if (modifiers.length === 0) {
            productsWithoutModifiers.push({
              id: product.id,
              name: product.name,
              sku: product.sku,
            })
          } else {
            productsWithModifiers.push({
              id: product.id,
              name: product.name,
              sku: product.sku,
              modifierCount: modifiers.length,
            })
          }
        }
        
        // Log progress every 10 products
        if (checkedCount % 10 === 0) {
          console.log(`Progress: ${checkedCount}/${products.length} products checked`)
        }
      } catch (error) {
        console.error(`Error checking modifiers for product ${product.id}:`, error)
      }
    }
    
    console.log(`=== CHECK COMPLETE ===`)
    console.log(`Products without modifiers: ${productsWithoutModifiers.length}`)
    console.log(`Products with modifiers: ${productsWithModifiers.length}`)
    
    return NextResponse.json({
      productsWithoutModifiers,
      productsWithModifiers,
      summary: {
        total: products.length,
        withoutModifiers: productsWithoutModifiers.length,
        withModifiers: productsWithModifiers.length,
      },
    })
  } catch (error) {
    console.error("Error checking products:", error)
    return NextResponse.json(
      {
        error: "Failed to check products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST endpoint to apply modifiers only to products without them
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { modifiers, productIds } = body
    
    console.log("=== POST REQUEST RECEIVED ===")
    console.log("Body:", JSON.stringify(body, null, 2))
    
    if (!modifiers || !Array.isArray(modifiers) || modifiers.length === 0) {
      return NextResponse.json({ error: "Modifiers array is required" }, { status: 400 })
    }
    
    console.log("=== APPLYING MODIFIERS TO PRODUCTS WITHOUT MODIFIERS ===")
    console.log(`Products to process: ${productIds?.length || "all without modifiers"}`)
    console.log(`Modifiers to apply: ${modifiers.length}`)
    console.log("Modifiers:", JSON.stringify(modifiers, null, 2))
    
    // First, get the list of products without modifiers
    let targetProducts: any[] = []
    
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      // Use provided product IDs
      targetProducts = productIds.map(id => ({ id }))
    } else {
      // Get all products without modifiers directly
      console.log("Fetching all products to check for modifiers...")
      
      // Fetch ALL products using pagination
      let allProducts: any[] = []
      let currentPage = 1
      let hasMorePages = true
      
      while (hasMorePages) {
        const productsResponse = await fetch(
          `${API_URL}/catalog/products?limit=250&page=${currentPage}`,
          {
            headers,
            cache: "no-store",
          }
        )
        
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`)
        }
        
        const productsData = await productsResponse.json()
        const products = productsData.data || []
        
        allProducts = [...allProducts, ...products]
        
        // Check if there are more pages
        const totalPages = productsData.meta?.pagination?.total_pages || 1
        hasMorePages = currentPage < totalPages
        currentPage++
        
        console.log(`Fetched page ${currentPage - 1}/${totalPages}, total products so far: ${allProducts.length}`)
        
        // Rate limiting between page fetches
        if (hasMorePages) {
          await delay(RATE_LIMIT_DELAY)
        }
      }
      
      console.log(`Found ${allProducts.length} total products`)
      
      // Check each product for modifiers
      const productsWithoutModifiers = []
      let checkedCount = 0
      
      for (const product of allProducts) {
        checkedCount++
        
        // Rate limiting - delay between each check
        if (checkedCount > 1) {
          await delay(RATE_LIMIT_DELAY)
        }
        
        try {
          const modifiersResponse = await fetch(
            `${API_URL}/catalog/products/${product.id}/modifiers`,
            {
              headers,
              cache: "no-store",
            }
          )
          
          if (modifiersResponse.ok) {
            const modifiersData = await modifiersResponse.json()
            const modifiers = modifiersData.data || []
            
            if (modifiers.length === 0) {
              productsWithoutModifiers.push({
                id: product.id,
                name: product.name,
                sku: product.sku,
              })
            }
          }
          
          // Log progress every 10 products
          if (checkedCount % 10 === 0) {
            console.log(`Progress: ${checkedCount}/${allProducts.length} products checked`)
          }
        } catch (error) {
          console.error(`Error checking modifiers for product ${product.id}:`, error)
        }
      }
      
      targetProducts = productsWithoutModifiers
      console.log(`Found ${targetProducts.length} products without modifiers`)
    }
    
    console.log(`Target products: ${targetProducts.length}`)
    
    if (targetProducts.length === 0) {
      return NextResponse.json({
        message: "No products without modifiers found",
        summary: {
          processed: 0,
          successful: 0,
          failed: 0,
        },
      })
    }
    
    // Process products in batches to respect rate limits
    const results = []
    const errors = []
    let processedCount = 0
    
    // Process in batches
    for (let i = 0; i < targetProducts.length; i += BATCH_SIZE) {
      const batch = targetProducts.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} products)`)
      
      // Process each product in the batch
      for (const product of batch) {
        processedCount++
        console.log(`Processing product ${processedCount}/${targetProducts.length}: ${product.id}`)
        
        // Apply each modifier to the product
        for (const modifier of modifiers) {
          try {
            // Rate limiting - delay between each API call
            await delay(RATE_LIMIT_DELAY)
            
            const response = await fetch(
              `${API_URL}/catalog/products/${product.id}/modifiers`,
              {
                method: "POST",
                headers,
                body: JSON.stringify(modifier),
              }
            )
            
            if (response.ok) {
              const data = await response.json()
              results.push({
                product_id: product.id,
                product_name: product.name,
                modifier_name: modifier.display_name,
                modifier_id: data.data?.id,
                success: true,
              })
            } else {
              const errorText = await response.text()
              let errorData
              try {
                errorData = JSON.parse(errorText)
              } catch {
                errorData = { message: errorText || "Unknown error" }
              }
              
              errors.push({
                product_id: product.id,
                product_name: product.name,
                modifier_name: modifier.display_name,
                error: errorData,
                status: response.status,
              })
            }
          } catch (error) {
            errors.push({
              product_id: product.id,
              product_name: product.name,
              modifier_name: modifier.display_name,
              error: error instanceof Error ? error.message : "Unknown error",
              type: "exception",
            })
          }
        }
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < targetProducts.length) {
        console.log(`Batch complete. Waiting ${BATCH_DELAY / 1000} seconds before next batch...`)
        await delay(BATCH_DELAY)
      }
    }
    
    console.log("=== APPLICATION COMPLETE ===")
    console.log(`Successful: ${results.length}`)
    console.log(`Failed: ${errors.length}`)
    
    return NextResponse.json({
      success: results,
      errors: errors,
      summary: {
        processed: processedCount,
        successful: results.length,
        failed: errors.length,
        successRate: `${Math.round((results.length / (results.length + errors.length)) * 100)}%`,
      },
      rateLimit: {
        delayBetweenCalls: RATE_LIMIT_DELAY,
        batchSize: BATCH_SIZE,
        delayBetweenBatches: BATCH_DELAY,
      },
    })
  } catch (error) {
    console.error("Error applying modifiers:", error)
    return NextResponse.json(
      {
        error: "Failed to apply modifiers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}