import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import crypto from 'crypto'

/**
 * Generate TikTok Shop OAuth authorization URL
 * @param state - CSRF protection state token
 */
export async function getTikTokAuthUrl(state: string): Promise<string> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  
  if (!clientKey) {
    throw new Error('TIKTOK_CLIENT_KEY not configured')
  }
  
  const params = new URLSearchParams({
    app_key: clientKey,
    state: state,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/tiktok`,
  })
  
  return `https://services.tiktokshop.com/open/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from TikTok
 * @param userId - User ID to associate store with
 */
export async function handleTikTokCallback(
  code: string,
  userId: string
): Promise<{ success: boolean; storeName: string; storeId: string }> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  
  if (!clientKey || !clientSecret) {
    throw new Error('TikTok credentials not configured')
  }
  
  // Generate signature for token exchange
  const timestamp = Math.floor(Date.now() / 1000)
  const signString = `app_key${clientKey}timestamp${timestamp}grant_typeauthorization_codeauth_code${code}`
  const sign = crypto
    .createHmac('sha256', clientSecret)
    .update(signString)
    .digest('hex')
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://auth.tiktok-shops.com/api/v2/token/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_key: clientKey,
      app_secret: clientSecret,
      auth_code: code,
      grant_type: 'authorization_code'
    }),
  })
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }
  
  const tokenData = await tokenResponse.json()
  
  if (tokenData.code !== 0) {
    throw new Error(tokenData.message || 'Failed to get access token')
  }
  
  const { access_token, refresh_token, access_token_expire_in } = tokenData.data
  
  // Get shop information
  const shopResponse = await fetch('https://open-api.tiktokglobalshop.com/api/shop/get_authorized_shop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': access_token
    },
    body: JSON.stringify({
      app_key: clientKey,
      timestamp: timestamp,
      sign: sign
    })
  })
  
  if (!shopResponse.ok) {
    throw new Error('Failed to fetch shop information')
  }
  
  const shopData = await shopResponse.json()
  const shop = shopData.data?.shops?.[0]
  
  if (!shop) {
    throw new Error('No TikTok Shop found for this account')
  }
  
  // Encrypt tokens
  const encryptedAccess = encrypt(access_token)
  const encryptedRefresh = encrypt(refresh_token)
  
  // Check if store connection already exists
  const existing = await db.storeConnection.findFirst({
    where: {
      userId: userId,
      platform: 'TIKTOK',
      externalStoreId: shop.shop_id
    }
  })
  
  if (existing) {
    // Update existing connection
    await db.storeConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: new Date(Date.now() + access_token_expire_in * 1000),
        scopes: ['product.read', 'product.write', 'order.read'], // TikTok scopes
        isActive: true,
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
        metadata: { shop }
      }
    })
    
    return {
      success: true,
      storeName: shop.shop_name,
      storeId: existing.id
    }
  }
  
  // Create new store connection
  const storeConnection = await db.storeConnection.create({
    data: {
      userId: userId,
      platform: 'TIKTOK',
      storeName: shop.shop_name,
      storeUrl: null, // TikTok doesn't provide public shop URL
      externalStoreId: shop.shop_id,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: new Date(Date.now() + access_token_expire_in * 1000),
      scopes: ['product.read', 'product.write', 'order.read'],
      isActive: true,
      syncStatus: 'connected',
      metadata: { shop }
    }
  })
  
  // For PAID users, create store subscription
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })
  
  if (user?.subscription?.tier === 'PAID') {
    // Find the lowest pricing tier
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
    storeName: shop.shop_name,
    storeId: storeConnection.id
  }
}

/**
 * Generate state token
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}