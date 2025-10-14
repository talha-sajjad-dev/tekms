import { db } from "@/lib/db"

/**
 * STORE-BASED SUBSCRIPTION SYSTEM
 *
 * This system uses per-store billing based on product count.
 * Each store has a StoreSubscription linked to a StorePricingTier.
 * There are NO user-level subscription limits.
 * All platforms are available to all users.
 */

export interface StoreSubscriptionInfo {
  hasSubscription: boolean
  tierName?: string
  minProducts?: number
  maxProducts?: number
  productCount: number
  monthlyPrice?: number
  status?: string
}

export interface UsageStatus {
  allowed: boolean
  current: number
  limit: number
  percentage: number
  remaining: number
}

/**
 * Get store subscription info (for billing/display purposes)
 */
export async function getStoreSubscriptionInfo(
  storeId: string
): Promise<StoreSubscriptionInfo> {
  const store = await db.storeConnection.findUnique({
    where: { id: storeId },
    include: {
      storeSubscription: {
        include: {
          pricingTier: true
        }
      }
    }
  })

  if (!store) {
    throw new Error('Store not found')
  }

  if (!store.storeSubscription) {
    return {
      hasSubscription: false,
      productCount: store.productCount
    }
  }

  return {
    hasSubscription: true,
    tierName: store.storeSubscription.pricingTier.name,
    minProducts: store.storeSubscription.pricingTier.minProducts,
    maxProducts: store.storeSubscription.pricingTier.maxProducts,
    productCount: store.productCount,
    monthlyPrice: Number(store.storeSubscription.pricingTier.monthlyPrice),
    status: store.storeSubscription.status
  }
}

/**
 * @deprecated User-level subscriptions are removed. Use getStoreSubscriptionInfo instead.
 */
export async function getUserSubscriptionLimits(userId: string): Promise<any> {
  // All platforms available to all users
  // Billing is per-store via StoreSubscription
  return {
    tier: 'STORE_BASED',
    productLimit: -1,
    allowBigCommerce: true,
    allowShopify: true,
    allowEtsy: true,
    allowTikTok: true,
    allowBulkOps: true,
    allowScheduledSync: true,
    allowAdvancedAnalytics: true,
    allowAPIAccess: true,
  }
}

/**
 * Check if store can add more products based on its pricing tier
 */
export async function checkStoreProductLimit(
  storeId: string
): Promise<UsageStatus> {
  const info = await getStoreSubscriptionInfo(storeId)

  if (!info.hasSubscription) {
    // No subscription yet - allow unlimited until billing is set up
    return {
      allowed: true,
      current: info.productCount,
      limit: -1,
      percentage: 0,
      remaining: -1,
    }
  }

  // -1 means unlimited in the tier
  if (info.maxProducts === -1) {
    return {
      allowed: true,
      current: info.productCount,
      limit: -1,
      percentage: 0,
      remaining: -1,
    }
  }

  const percentage = (info.productCount / (info.maxProducts || 1)) * 100
  const remaining = Math.max(0, (info.maxProducts || 0) - info.productCount)

  return {
    allowed: info.productCount < (info.maxProducts || 0),
    current: info.productCount,
    limit: info.maxProducts || 0,
    percentage,
    remaining,
  }
}

/**
 * @deprecated All platforms available to all users
 */
export async function checkProductLimit(userId: string): Promise<UsageStatus> {
  // No user-level limits - only per-store limits via checkStoreProductLimit
  const productCount = await db.product.count({ where: { userId } })
  
  return {
    allowed: true,
    current: productCount,
    limit: -1,
    percentage: 0,
    remaining: -1,
  }
}

/**
 * All platforms available to all users
 */
export async function checkPlatformAccess(
  userId: string,
  platform: "BIGCOMMERCE" | "SHOPIFY" | "ETSY" | "TIKTOK"
): Promise<boolean> {
  return true // All platforms available
}

/**
 * All features available to all users
 */
export async function checkFeatureAccess(
  userId: string,
  feature: "bulk" | "scheduled" | "analytics" | "api"
): Promise<boolean> {
  return true // All features available
}

/**
 * Record product usage for tracking
 */
export async function recordProductUsage(
  userId: string,
  action: string,
  productCount: number = 1,
  platform?: "BIGCOMMERCE" | "SHOPIFY" | "ETSY" | "TIKTOK",
  metadata?: any
): Promise<void> {
  await db.usageRecord.create({
    data: {
      userId,
      action,
      productCount,
      platform,
      metadata: metadata || {},
    },
  })
}

/**
 * Check if user can perform an action
 * In store-based system, all actions are allowed - billing is per-store
 */
export async function canPerformAction(
  userId: string,
  action: {
    type: "add_product" | "bulk_operation" | "scheduled_sync" | "api_access"
    platform?: "BIGCOMMERCE" | "SHOPIFY" | "ETSY" | "TIKTOK"
    productCount?: number
    storeId?: string
  }
): Promise<{ allowed: boolean; reason?: string }> {
  // In store-based model, all platforms and features are available
  // Billing is handled per-store via StoreSubscription
  
  // If storeId provided, check store-specific limits
  if (action.storeId && action.type === "add_product") {
    const storeUsage = await checkStoreProductLimit(action.storeId)
    
    const requiredProducts = action.productCount || 1
    
    if (!storeUsage.allowed || (storeUsage.remaining !== -1 && storeUsage.remaining < requiredProducts)) {
      return {
        allowed: false,
        reason: `Store product limit reached. This store allows ${storeUsage.limit} products.`,
      }
    }
  }

  return { allowed: true }
}

/**
 * Get usage summary for user dashboard
 */
export async function getUsageSummary(userId: string) {
  const [usage, products, stores] = await Promise.all([
    checkProductLimit(userId),
    db.product.groupBy({
      by: ["platform"],
      where: { userId },
      _count: true,
    }),
    db.storeConnection.findMany({
      where: { userId },
      include: {
        storeSubscription: {
          include: {
            pricingTier: true
          }
        }
      }
    })
  ])

  const platformBreakdown = products.reduce(
    (acc, item) => {
      acc[item.platform] = item._count
      return acc
    },
    {} as Record<string, number>
  )

  return {
    tier: "STORE_BASED",
    productUsage: usage,
    platformBreakdown,
    stores: stores.map(s => ({
      id: s.id,
      name: s.storeName,
      platform: s.platform,
      productCount: s.productCount,
      tierName: s.storeSubscription?.pricingTier.name,
      monthlyPrice: s.storeSubscription ? Number(s.storeSubscription.pricingTier.monthlyPrice) : 0
    })),
    features: {
      bigcommerce: true,
      shopify: true,
      etsy: true,
      tiktok: true,
      bulkOps: true,
      scheduledSync: true,
      analytics: true,
      api: true,
    },
  }
}