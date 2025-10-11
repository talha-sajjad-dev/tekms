import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  
  return user
}

export async function getUserWithSubscription(userId: string) {
  return await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          // We'll join with pricing plan once user has a subscription
        },
      },
    },
  })
}

export async function checkSubscriptionAccess(
  userId: string,
  feature: 'bigcommerce' | 'shopify' | 'etsy' | 'tiktok' | 'bulk' | 'scheduled' | 'analytics' | 'api'
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  })

  if (!user || !user.subscription) {
    return false
  }

  // Get the pricing plan for this tier
  const plan = await db.pricingPlan.findUnique({
    where: { tier: user.subscription.tier },
  })

  if (!plan) {
    return false
  }

  // Check feature access based on plan
  const featureMap = {
    bigcommerce: plan.allowBigCommerce,
    shopify: plan.allowShopify,
    etsy: plan.allowEtsy,
    tiktok: plan.allowTikTok,
    bulk: plan.allowBulkOps,
    scheduled: plan.allowScheduledSync,
    analytics: plan.allowAdvancedAnalytics,
    api: plan.allowAPIAccess,
  }

  return featureMap[feature] || false
}

export async function checkProductLimit(userId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
  percentage: number
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  })

  if (!user || !user.subscription) {
    return { allowed: false, current: 0, limit: 0, percentage: 0 }
  }

  // Get the pricing plan
  const plan = await db.pricingPlan.findUnique({
    where: { tier: user.subscription.tier },
  })

  if (!plan) {
    return { allowed: false, current: 0, limit: 0, percentage: 0 }
  }

  // Get usage for current billing period (this month)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const usage = await db.usageRecord.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      productCount: true,
    },
  })

  const current = usage._sum.productCount || 0
  const limit = plan.productLimit
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current, limit: -1, percentage: 0 }
  }

  const percentage = (current / limit) * 100

  return {
    allowed: current < limit,
    current,
    limit,
    percentage,
  }
}