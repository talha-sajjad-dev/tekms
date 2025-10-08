/**
 * BigCommerce API client utility
 */

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

/**
 * Get all products from BigCommerce
 */
export async function getProducts() {
  const response = await fetch(`${API_URL}/catalog/products`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`BigCommerce API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get a specific product by ID
 */
export async function getProduct(id: string) {
  const response = await fetch(`${API_URL}/catalog/products/${id}`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`BigCommerce API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a new product
 */
export async function createProduct(productData: any) {
  const response = await fetch(`${API_URL}/catalog/products`, {
    method: "POST",
    headers,
    body: JSON.stringify(productData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

/**
 * Update an existing product
 */
export async function updateProduct(id: string, productData: any) {
  const response = await fetch(`${API_URL}/catalog/products/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(productData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`BigCommerce API error: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string) {
  const response = await fetch(`${API_URL}/catalog/products/${id}`, {
    method: "DELETE",
    headers,
  })

  if (!response.ok) {
    throw new Error(`BigCommerce API error: ${response.status}`)
  }

  return true
}
