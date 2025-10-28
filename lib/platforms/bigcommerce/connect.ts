import { db } from '@/lib/db'
import { encrypt } from '@/lib/encryption'

/**
 * Connect BigCommerce store using store hash and access token
 * @param userId - User ID
 * @param storeHash - BigCommerce store hash (e.g., "abc123xyz")
 * @param accessToken - BigCommerce API access token
 */
export async function connectBigCommerceStore(
  userId: string,
  storeHash: string,
  accessToken: string
): Promise<{ success: boolean; storeName: string; storeId: string }> {
  
  let storeInfo: any = { name: `BigCommerce Store (${storeHash})`, domain: `store-${storeHash}.mybigcommerce.com` }
  
  const v2Response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}/v2/store`,
    {
      headers: {
        'X-Auth-Token': accessToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }
  )
  
  if (v2Response.ok) {
    storeInfo = await v2Response.json()
  } else {
    const v3Response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=1`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        }
      }
    )
    
    if (!v3Response.ok) {
      const error = await v3Response.text()
      throw new Error(`Invalid BigCommerce credentials: ${error}`)
    }
  }
  
  // Encrypt access token
  const encryptedToken = encrypt(accessToken)
  
  // Check if store connection already exists
  const existing = await db.storeConnection.findFirst({
    where: {
      userId: userId,
      platform: 'BIGCOMMERCE',
      externalStoreId: storeHash
    }
  })
  
  if (existing) {
    // Update existing connection
    await db.storeConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedToken,
        storeName: storeInfo.name || storeInfo.domain || 'BigCommerce Store',
        storeUrl: storeInfo.domain,
        isActive: true,
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
        metadata: { store: storeInfo }
      }
    })
    
    return {
      success: true,
      storeName: storeInfo.name || storeInfo.domain,
      storeId: existing.id
    }
  }
  
  // Create new store connection
  const storeConnection = await db.storeConnection.create({
    data: {
      userId: userId,
      platform: 'BIGCOMMERCE',
      storeName: storeInfo.name || storeInfo.domain || 'BigCommerce Store',
      storeUrl: storeInfo.domain,
      externalStoreId: storeHash,
      accessToken: encryptedToken,
      scopes: ['store_v2_products', 'store_v2_orders', 'store_v2_customers'], // Based on token scope
      isActive: true,
      syncStatus: 'connected',
      metadata: { store: storeInfo }
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
    storeName: storeInfo.name || storeInfo.domain,
    storeId: storeConnection.id
  }
}

/**
 * Test BigCommerce credentials
 */
export async function testBigCommerceCredentials(
  storeHash: string,
  accessToken: string
): Promise<{ valid: boolean; storeName?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?limit=1`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        }
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      return { 
        valid: true, 
        storeName: `BigCommerce Store (${storeHash})`
      }
    }
    
    // If v3 fails, try v2 store endpoint
    const v2Response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/store`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        }
      }
    )
    
    if (v2Response.ok) {
      const storeInfo = await v2Response.json()
      return { 
        valid: true, 
        storeName: storeInfo.name || storeInfo.domain 
      }
    }
    
    return { valid: false, error: 'Invalid credentials - neither v2 nor v3 API accessible' }
    
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    }
  }
}