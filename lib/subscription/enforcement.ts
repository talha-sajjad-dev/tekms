import { db } from "@/lib/db"
import { SubscriptionTier } from "@prisma/client"

export interface SubscriptionLimits {
  tier: SubscriptionTier
  productLimit: number
  allowBigCommerce: boolean
  allowShopify: boolean
  allowEtsy: boolean
  allowTikTok: boolean
  allowBulkOps: boolean
  allowScheduledSync: boolean
  allowAdvancedAnalytics: boolean
  allowAPIAccess: boolean
}

export interface UsageStatus {
  allowed: boolean
  current: number
  limit: number
  percentage: number
  remaining: number
}

/**
 * Get user's subscription limits based on their tier
 */
export async function getUserSubscriptionLimits(
  userId: string
): Promise<SubscriptionLimits | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  })

  if (!user?.subscription) {
    return null
  }

  const plan = await db.pricingPlan.findUnique({
    where: { tier: user.subscription.tier },
  })

  if (!plan) {
    return null
  }

  return {
    tier: user.subscription.tier,
    productLimit: plan.productLimit,
    allowBigCommerce: plan.allowBigCommerce,
    allowShopify: plan.allowShopify,
    allowEtsy: plan.allowEtsy,
    allowTikTok: plan.allowTikTok,
    allowBulkOps: plan.allowBulkOps,
    allowScheduledSync: plan.allowScheduledSync,
    allowAdvancedAnalytics: plan.allowAdvancedAnalytics,
    allowAPIAccess: plan.allowAPIAccess,
  }
}

/**
 * Check if user can add more products
 */
export async function checkProductLimit(
  userId: string
): Promise<UsageStatus> {
  const limits = await getUserSubscriptionLimits(userId)

  if (!limits) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      percentage: 0,
      remaining: 0,
    }
  }

  // Count total products for user
  const productCount = await db.product.count({
    where: { userId },
  })

  // -1 means unlimited
  if (limits.productLimit === -1) {
    return {
      allowed: true,
      current: productCount,
      limit: -1,
      percentage: 0,
      remaining: -1,
    }
  }

  const percentage = (productCount / limits.productLimit) * 100
  const remaining = Math.max(0, limits.productLimit - productCount)

  return {
    allowed: productCount < limits.productLimit,
    current: productCount,
    limit: limits.productLimit,
    percentage,
    remaining,
  }
}

/**
 * Check if user has access to a specific platform
 */
export async function checkPlatformAccess(
  userId: string,
  platform: "BIGCOMMERCE" | "SHOPIFY" | "ETSY" | "TIKTOK"
): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)

  if (!limits) {
    return false
  }

  const platformMap = {
    BIGCOMMERCE: limits.allowBigCommerce,
    SHOPIFY: limits.allowShopify,
    ETSY: limits.allowEtsy,
    TIKTOK: limits.allowTikTok,
  }

  return platformMap[platform] || false
}

/**
 * Check if user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: "bulk" | "scheduled" | "analytics" | "api"
): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)

  if (!limits) {
    return false
  }

  const featureMap = {
    bulk: limits.allowBulkOps,
    scheduled: limits.allowScheduledSync,
    analytics: limits.allowAdvancedAnalytics,
    api: limits.allowAPIAccess,
  }

  return featureMap[feature] || false
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
 * Check if user can perform an action (combines all checks)
 */
export async function canPerformAction(
  userId: string,
  action: {
    type: "add_product" | "bulk_operation" | "scheduled_sync" | "api_access"
    platform?: "BIGCOMMERCE" | "SHOPIFY" | "ETSY" | "TIKTOK"
    productCount?: number
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId)

  if (!limits) {
    return {
      allowed: false,
      reason: "No active subscription found",
    }
  }

  // Check product limit for add_product
  if (action.type === "add_product") {
    const usage = await checkProductLimit(userId)
    
    const requiredProducts = action.productCount || 1
    
    if (!usage.allowed || usage.remaining < requiredProducts) {
      return {
        allowed: false,
        reason: `Product limit reached. You have ${usage.remaining} products remaining on your ${limits.tier} plan.`,
      }
    }
  }

  // Check platform access
  if (action.platform) {
    const hasAccess = await checkPlatformAccess(userId, action.platform)
    if (!hasAccess) {
      return {
        allowed: false,
        reason: `Your ${limits.tier} plan does not include access to ${action.platform}. Please upgrade to continue.`,
      }
    }
  }

  // Check feature access
  if (action.type === "bulk_operation") {
    const hasAccess = await checkFeatureAccess(userId, "bulk")
    if (!hasAccess) {
      return {
        allowed: false,
        reason: "Bulk operations are only available on Professional and Enterprise plans.",
      }
    }
  }

  if (action.type === "scheduled_sync") {
    const hasAccess = await checkFeatureAccess(userId, "scheduled")
    if (!hasAccess) {
      return {
        allowed: false,
        reason: "Scheduled syncs are only available on Professional and Enterprise plans.",
      }
    }
  }

  if (action.type === "api_access") {
    const hasAccess = await checkFeatureAccess(userId, "api")
    if (!hasAccess) {
      return {
        allowed: false,
        reason: "API access is only available on Enterprise plan.",
      }
    }
  }

  return { allowed: true }
}

/**
 * Get usage summary for user dashboard
 */
export async function getUsageSummary(userId: string) {
  const [limits, usage, products] = await Promise.all([
    getUserSubscriptionLimits(userId),
    checkProductLimit(userId),
    db.product.groupBy({
      by: ["platform"],
      where: { userId },
      _count: true,
    }),
  ])

  const platformBreakdown = products.reduce(
    (acc, item) => {
      acc[item.platform] = item._count
      return acc
    },
    {} as Record<string, number>
  )

  return {
    tier: limits?.tier || "FREE",
    productUsage: usage,
    platformBreakdown,
    features: {
      bigcommerce: limits?.allowBigCommerce || false,
      shopify: limits?.allowShopify || false,
      etsy: limits?.allowEtsy || false,
      tiktok: limits?.allowTikTok || false,
      bulkOps: limits?.allowBulkOps || false,
      scheduledSync: limits?.allowScheduledSync || false,
      analytics: limits?.allowAdvancedAnalytics || false,
      api: limits?.allowAPIAccess || false,
    },
  }
}