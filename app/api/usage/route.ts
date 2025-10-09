import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getMonthlyUsage,
  getUsageByPlatform,
  checkUsageLimit,
  getUsageHistory,
  getDaysUntilReset,
} from '@/lib/usage/tracker'

/**
 * GET /api/usage
 * Get current usage statistics for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Get all usage data in parallel
    const [monthlyTotal, platformBreakdown, limitStatus, history] = await Promise.all([
      getMonthlyUsage(session.user.id),
      getUsageByPlatform(session.user.id),
      checkUsageLimit(session.user.id),
      getUsageHistory(session.user.id, days),
    ])

    const daysUntilReset = getDaysUntilReset()

    return NextResponse.json({
      monthlyTotal,
      platformBreakdown,
      limitStatus,
      history,
      daysUntilReset,
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}