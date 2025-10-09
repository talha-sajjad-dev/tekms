import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/subscription/plans'

interface TrackUsageParams {
  userId: string
  action: string
  productCount?: number
  platform?: 'BIGCOMMERCE' | 'TIKTOK' | 'ETSY'
  metadata?: Record<string, any>
}

/**
 * Track a usage event
 */
export async function trackUsage({
  userId,
  action,
  productCount = 1,
  platform,
  metadata,
}: TrackUsageParams): Promise<void> {
  try {
    await prisma.usageRecord.create({
      data: {
        userId,
        action,
        productCount,
        platform,
        metadata: metadata || null,
      },
    })
  } catch (error) {
    console.error('Error tracking usage:', error)
    // Don't throw - tracking should not break the main operation
  }
}

/**
 * Get usage for the current month
 */
export async function getMonthlyUsage(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    select: {
      productCount: true,
    },
  })

  return records.reduce((sum: number, record: { productCount: number }) => sum + record.productCount, 0)
}

/**
 * Get usage breakdown by platform
 */
export async function getUsageByPlatform(userId: string) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    select: {
      platform: true,
      productCount: true,
    },
  })

  const breakdown = {
    BIGCOMMERCE: 0,
    TIKTOK: 0,
    ETSY: 0,
    total: 0,
  }

  records.forEach((record: { platform: 'BIGCOMMERCE' | 'TIKTOK' | 'ETSY' | null; productCount: number }) => {
    if (record.platform) {
      breakdown[record.platform] += record.productCount
    }
    breakdown.total += record.productCount
  })

  return breakdown
}

/**
 * Check if user can perform operation based on their subscription tier
 */
export async function checkUsageLimit(
  userId: string
): Promise<{
  allowed: boolean
  current: number
  limit: number
  tier: SubscriptionTier
  remaining: number
}> {
  // Get user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  const tier = (subscription?.tier || 'FREE') as SubscriptionTier
  const tierConfig = SUBSCRIPTION_TIERS[tier]
  const limit = tierConfig.productLimit
  const current = await getMonthlyUsage(userId)

  // -1 means unlimited
  const allowed = limit === -1 || current < limit
  const remaining = limit === -1 ? Infinity : Math.max(0, limit - current)

  return {
    allowed,
    current,
    limit,
    tier,
    remaining,
  }
}

/**
 * Enforce usage limit - throws error if limit exceeded
 */
export async function enforceUsageLimit(
  userId: string,
  productCount: number = 1
): Promise<void> {
  const usage = await checkUsageLimit(userId)

  if (!usage.allowed) {
    throw new Error(
      `Monthly product limit reached. You have used ${usage.current} of ${usage.limit} products this month. Upgrade your plan to continue.`
    )
  }

  // Check if this operation would exceed the limit
  if (usage.limit !== -1 && usage.current + productCount > usage.limit) {
    const wouldExceedBy = usage.current + productCount - usage.limit
    throw new Error(
      `This operation would exceed your monthly limit by ${wouldExceedBy} products. Current usage: ${usage.current}/${usage.limit}. Upgrade your plan to continue.`
    )
  }
}

/**
 * Get usage history for analytics
 */
export async function getUsageHistory(
  userId: string,
  days: number = 30
): Promise<Array<{ date: string; count: number }>> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      productCount: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Group by date
  const grouped = new Map<string, number>()

  records.forEach((record: { createdAt: Date; productCount: number }) => {
    const date = record.createdAt.toISOString().split('T')[0]
    grouped.set(date, (grouped.get(date) || 0) + record.productCount)
  })

  return Array.from(grouped.entries()).map(([date, count]) => ({
    date,
    count,
  }))
}

/**
 * Get days until usage resets
 */
export function getDaysUntilReset(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const diff = nextMonth.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}