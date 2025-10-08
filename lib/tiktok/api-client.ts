/**
 * TikTok Shop API Client
 */

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID || '7557173102922237964'
const TIKTOK_APP_KEY = process.env.TIKTOK_CLIENT_ID || 'sbawlkhjww8r7sef4q'
const TIKTOK_APP_SECRET = process.env.TIKTOK_CLIENT_SECRET || '05T8DtbLtKsPI26cdq6n772OcGvbFLMw'
const IS_SANDBOX = process.env.TIKTOK_SANDBOX === 'true'

// TikTok API URLs
const SANDBOX_BASE_URL = 'https://sandbox-api.tiktok-shops.com'
const PRODUCTION_BASE_URL = 'https://api.tiktok-shops.com'
const BASE_URL = IS_SANDBOX ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL

// Both sandbox and production use the same auth URLs
const AUTH_URL = 'https://services.tiktokshop.com/open/authorize'
const TOKEN_URL = 'https://auth.tiktok-shops.com/api/v2/token/get'

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    service_id: TIKTOK_APP_KEY,  // TikTok uses service_id for authorization
    state: state
  })

  return `${AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessToken(code: string) {
  const params = new URLSearchParams({
    app_key: TIKTOK_APP_KEY,  // Use App Key for token exchange (not App ID)
    app_secret: TIKTOK_APP_SECRET,
    auth_code: code,
    grant_type: 'authorized_code'
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

/**
 * Create or update a product on TikTok Shop
 */
export async function createProduct(accessToken: string, shopId: string, productData: any) {
  const response = await fetch(`${BASE_URL}/api/products/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': accessToken
    },
    body: JSON.stringify({
      shop_id: shopId,
      ...productData
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

/**
 * Get shop information
 */
export async function getShopInfo(accessToken: string) {
  const response = await fetch(`${BASE_URL}/api/shop/get`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': accessToken
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

/**
 * Upload product image
 */
export async function uploadImage(accessToken: string, imageUrl: string) {
  // TikTok requires images to be uploaded first, then get an image ID
  const response = await fetch(`${BASE_URL}/api/products/upload_imgs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': accessToken
    },
    body: JSON.stringify({
      img_url: imageUrl
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}
