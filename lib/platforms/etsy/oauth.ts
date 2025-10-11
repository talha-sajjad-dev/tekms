import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { getSetting } from '@/lib/settings'
import crypto from 'crypto'

/**
 * Generate Etsy OAuth authorization URL
 * @param state - CSRF protection state token
 */
export async function getEtsyAuthUrl(state: string): Promise<string> {
  // Get client ID from database settings (Etsy calls this "Keystring")
  const clientId = await getSetting('etsy_client_id', process.env.ETSY_CLIENT_ID || '')
  
  if (!clientId) {
    throw new Error('Etsy API Key not configured. Please configure it in Admin > System Settings > OAuth.')
  }
  
  // Redirect URI is NOT stored in database for Etsy - it's just the app URL
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/etsy`
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'listings_r listings_w shops_r transactions_r',
    state: state,
    code_challenge_method: 'S256',
    code_challenge: generateCodeChallenge(state),
  })
  
  return `https://www.etsy.com/oauth/connect?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Etsy
 * @param userId - User ID to associate store with
 * @param codeVerifier - PKCE code verifier (using state token)
 */
export async function handleEtsyCallback(
  code: string,
  userId: string,
  codeVerifier: string
): Promise<{ success: boolean; storeName: string; storeId: string }> {
  // Get client ID from database settings
  const clientId = await getSetting('etsy_client_id', process.env.ETSY_CLIENT_ID || '')
  
  if (!clientId) {
    throw new Error('Etsy API Key not configured')
  }
  
  // Redirect URI is NOT from database - just use app URL
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/etsy`
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
      code_verifier: codeVerifier,
    }),
  })
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }
  
  const tokens = await tokenResponse.json()
  
  // Get shop information using the access token
  const shopResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
    headers: { 
      'Authorization': `Bearer ${tokens.access_token}`,
      'x-api-key': clientId
    }
  })
  
  if (!shopResponse.ok) {
    throw new Error('Failed to fetch user information')
  }
  
  const userData = await shopResponse.json()
  
  // Get the user's shops
  const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${userData.user_id}/shops`, {
    headers: { 
      'Authorization': `Bearer ${tokens.access_token}`,
      'x-api-key': clientId
    }
  })
  
  if (!shopsResponse.ok) {
    throw new Error('Failed to fetch shops')
  }
  
  const shopsData = await shopsResponse.json()
  const shop = shopsData.results?.[0] // Get first shop
  
  if (!shop) {
    throw new Error('No Etsy shop found for this account')
  }
  
  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.access_token)
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
  
  // Check if store connection already exists
  const existing = await db.storeConnection.findFirst({
    where: {
      userId: userId,
      platform: 'ETSY',
      externalStoreId: shop.shop_id.toString()
    }
  })
  
  if (existing) {
    // Update existing connection
    await db.storeConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: tokens.scope.split(' '),
        isActive: true,
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
        metadata: { shop, user: userData }
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
      platform: 'ETSY',
      storeName: shop.shop_name,
      storeUrl: shop.url,
      externalStoreId: shop.shop_id.toString(),
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope.split(' '),
      isActive: true,
      syncStatus: 'connected',
      metadata: { shop, user: userData }
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
    storeName: shop.shop_name,
    storeId: storeConnection.id
  }
}

/**
 * Refresh Etsy access token
 * @param refreshToken - Encrypted refresh token
 */
export async function refreshEtsyToken(refreshToken: string): Promise<string> {
  // Get client ID from database settings
  const clientId = await getSetting('etsy_client_id', process.env.ETSY_CLIENT_ID || '')
  
  if (!clientId) {
    throw new Error('Etsy API Key not configured')
  }
  
  const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  })
  
  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh Etsy token')
  }
  
  const tokens = await tokenResponse.json()
  return tokens.access_token
}

/**
 * Generate PKCE code challenge
 */
function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

/**
 * Generate state token for OAuth
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}