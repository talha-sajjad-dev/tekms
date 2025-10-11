import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { getSetting } from '@/lib/settings'
import crypto from 'crypto'

/**
 * Generate Shopify OAuth authorization URL
 * @param shop - Shopify shop domain (e.g., "my-store.myshopify.com")
 * @param state - CSRF protection state token
 */
export async function getShopifyAuthUrl(shop: string, state: string): Promise<string> {
  const clientId = await getSetting('shopify_client_id', process.env.SHOPIFY_CLIENT_ID || '')
  
  if (!clientId) {
    throw new Error('Shopify Client ID not configured. Please configure in Admin > System Settings > OAuth.')
  }
  
  const redirectUri = await getSetting('shopify_redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/callback/shopify`)
  
  // Clean shop domain
  const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'read_products,write_products,read_inventory,write_inventory,read_orders',
    redirect_uri: redirectUri,
    state: state,
    grant_options: JSON.stringify({ access_mode: 'offline' })
  })
  
  return `https://${cleanShop}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Shopify
 * @param shop - Shopify shop domain
 * @param userId - User ID to associate store with
 */
export async function handleShopifyCallback(
  code: string,
  shop: string,
  userId: string
): Promise<{ success: boolean; storeName: string; storeId: string }> {
  const clientId = await getSetting('shopify_client_id', process.env.SHOPIFY_CLIENT_ID || '')
  const clientSecret = await getSetting('shopify_client_secret', process.env.SHOPIFY_CLIENT_SECRET || '')
  
  if (!clientId || !clientSecret) {
    throw new Error('Shopify credentials not configured')
  }
  
  // Clean shop domain
  const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
  
  // Exchange code for access token
  const tokenResponse = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  })
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }
  
  const { access_token, scope } = await tokenResponse.json()
  
  // Get shop information
  const shopResponse = await fetch(`https://${cleanShop}/admin/api/2024-01/shop.json`, {
    headers: { 
      'X-Shopify-Access-Token': access_token,
      'Content-Type': 'application/json'
    }
  })
  
  if (!shopResponse.ok) {
    throw new Error('Failed to fetch shop information')
  }
  
  const { shop: shopInfo } = await shopResponse.json()
  
  // Encrypt access token
  const encryptedToken = encrypt(access_token)
  
  // Check if store connection already exists
  const existing = await db.storeConnection.findFirst({
    where: {
      userId: userId,
      platform: 'SHOPIFY',
      externalStoreId: shopInfo.id.toString()
    }
  })
  
  if (existing) {
    // Update existing connection
    await db.storeConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedToken,
        scopes: scope.split(','),
        isActive: true,
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
        metadata: { shop: shopInfo }
      }
    })
    
    return {
      success: true,
      storeName: shopInfo.name,
      storeId: existing.id
    }
  }
  
  // Create new store connection
  const storeConnection = await db.storeConnection.create({
    data: {
      userId: userId,
      platform: 'SHOPIFY',
      storeName: shopInfo.name,
      storeUrl: shopInfo.myshopify_domain,
      externalStoreId: shopInfo.id.toString(),
      accessToken: encryptedToken,
      scopes: scope.split(','),
      isActive: true,
      syncStatus: 'connected',
      metadata: { shop: shopInfo }
    }
  })
  
  // For PAID users, create store subscription
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })
  
  if (user?.subscription?.tier === 'PAID') {
    // Find the lowest pricing tier (Starter: 10-100 products)
    const defaultTier = await db.storePricingTier.findFirst({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    })
    
    if (defaultTier) {
      await db.storeSubscription.create({
        data: {
          storeConnectionId: storeConnection.id,
          userId: userId,
          pricingTierId: defaultTier.id,
          productCount: 0,
          status: 'ACTIVE'
        }
      })
    }
  }
  
  return {
    success: true,
    storeName: shopInfo.name,
    storeId: storeConnection.id
  }
}

/**
 * Generate CSRF state token for OAuth
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify HMAC signature from Shopify (for webhook verification)
 */
export async function verifyShopifyHmac(query: Record<string, string>, hmac: string): Promise<boolean> {
  const clientSecret = await getSetting('shopify_client_secret', process.env.SHOPIFY_CLIENT_SECRET || '')
  if (!clientSecret) return false
  
  // Remove hmac and signature from query
  const { hmac: _hmac, signature: _signature, ...params } = query
  
  // Sort and create query string
  const orderedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  // Generate HMAC
  const hash = crypto
    .createHmac('sha256', clientSecret)
    .update(orderedParams)
    .digest('hex')
  
  return hash === hmac
}