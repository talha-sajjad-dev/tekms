import { db } from '@/lib/db'
import { Platform, SubscriptionTier } from '@prisma/client'

/**
 * Check if user can use legacy Etsy Import feature
 * Available to: Admins always, or users with specific permission
 */
export async function canUseLegacyEtsyImport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, allowLegacyEtsyImport: true }
  })
  
  if (!user) return false
  
  // Admins always have access, or user has specific permission
  return user.role === 'ADMIN' || user.allowLegacyEtsyImport === true
}

/**
 * Check if user can use legacy TikTok Export feature
 * Available to: Admins always, or users with specific permission
 */
export async function canUseLegacyTikTokExport(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, allowLegacyTikTokExport: true }
  })
  
  if (!user) return false
  
  return user.role === 'ADMIN' || user.allowLegacyTikTokExport === true
}

/**
 * Check if user can connect a new store
 * Returns: { allowed: boolean, reason?: string, limit?: number }
 */
export async function canConnectStore(
  userId: string,
  platform?: Platform
): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      storeConnections: {
        where: { isActive: true }
      }
    }
  })
  
  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }
  
  const tier = user.subscription?.tier || 'FREE'
  const currentConnections = user.storeConnections.length
  
  // Check connection limits by tier
  const limits: Record<SubscriptionTier, number> = {
    FREE: 1,           // 1 store only
    PAID: -1,          // Unlimited stores
    ENTERPRISE: -1     // Unlimited stores
  }
  
  const limit = limits[tier]
  
  if (limit !== -1 && currentConnections >= limit) {
    return { 
      allowed: false, 
      reason: `Your ${tier} plan allows ${limit} store connection${limit > 1 ? 's' : ''}. Upgrade for unlimited stores.`,
      limit
    }
  }
  
  return { allowed: true, limit: limit === -1 ? undefined : limit }
}

/**
 * Get store connection limit for a user's tier
 */
export function getStoreConnectionLimit(tier: SubscriptionTier): number {
  const limits: Record<SubscriptionTier, number> = {
    FREE: 1,
    PAID: -1,          // -1 means unlimited
    ENTERPRISE: -1
  }
  
  return limits[tier]
}

/**
 * Check if user can import products (FREE tier has 10 product total limit)
 */
export async function canImportProducts(
  userId: string,
  productCount: number
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      products: {
        select: { id: true }
      }
    }
  })
  
  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }
  
  const tier = user.subscription?.tier || 'FREE'
  
  // FREE tier has a global 10 product limit
  if (tier === 'FREE') {
    const currentCount = user.products.length
    const totalAfterImport = currentCount + productCount
    
    if (totalAfterImport > 10) {
      return {
        allowed: false,
        reason: 'Free plan allows 10 products total. Upgrade to import more.',
        remaining: Math.max(0, 10 - currentCount)
      }
    }
    
    return {
      allowed: true,
      remaining: 10 - totalAfterImport
    }
  }
  
  // PAID and ENTERPRISE users: per-store limits enforced at store subscription level
  return { allowed: true }
}

/**
 * Find appropriate pricing tier for a product count
 */
export async function findPricingTierForProductCount(productCount: number) {
  const tier = await db.storePricingTier.findFirst({
    where: {
      AND: [
        { minProducts: { lte: productCount } },
        {
          OR: [
            { maxProducts: { gte: productCount } },
            { maxProducts: -1 } // Unlimited
          ]
        },
        { isActive: true }
      ]
    },
    orderBy: { displayOrder: 'asc' }
  })
  
  return tier
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  return user?.role === 'ADMIN'
}

/**
 * Get user's subscription tier
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })
  
  return user?.subscription?.tier || 'FREE'
}

/**
 * Check if a specific store can accept more products
 * For PAID users with per-store subscriptions
 */
export async function canStoreAcceptProducts(
  storeConnectionId: string,
  additionalProductCount: number
): Promise<{ allowed: boolean; reason?: string; currentTier?: string; suggestedTier?: string }> {
  const store = await db.storeConnection.findUnique({
    where: { id: storeConnectionId },
    include: {
      storeSubscription: {
        include: { pricingTier: true }
      }
    }
  })
  
  if (!store) {
    return { allowed: false, reason: 'Store not found' }
  }
  
  if (!store.storeSubscription) {
    // No subscription yet (shouldn't happen for PAID users)
    return { allowed: false, reason: 'Store subscription not found' }
  }
  
  const currentCount = store.productCount
  const newCount = currentCount + additionalProductCount
  const currentTier = store.storeSubscription.pricingTier
  
  // Check if new count exceeds current tier max
  if (currentTier.maxProducts !== -1 && newCount > currentTier.maxProducts) {
    // Find appropriate tier
    const newTier = await findPricingTierForProductCount(newCount)
    
    if (!newTier) {
      return {
        allowed: false,
        reason: 'Product count exceeds maximum. Contact us for Enterprise pricing.',
        currentTier: currentTier.name
      }
    }
    
    return {
      allowed: false,
      reason: `This import would exceed your ${currentTier.name} plan limit (${currentTier.maxProducts} products). Upgrade to ${newTier.name} plan to continue.`,
      currentTier: currentTier.name,
      suggestedTier: newTier.name
    }
  }
  
  return { allowed: true, currentTier: currentTier.name }
}