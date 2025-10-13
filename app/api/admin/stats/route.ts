import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET - System-wide statistics (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all statistics in parallel
    const [totalUsers, totalStores, totalProducts, storeSubscriptions] = await Promise.all([
      db.user.count(),
      db.storeConnection.count(),
      db.product.count(),
      db.storeSubscription.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          pricingTier: true
        }
      })
    ])

    // Calculate monthly revenue
    const monthlyRevenue = storeSubscriptions.reduce((sum, sub) => {
      return sum + Number(sub.pricingTier.monthlyPrice)
    }, 0)

    // Get platform breakdown
    const platformBreakdown = await db.storeConnection.groupBy({
      by: ['platform'],
      _count: true
    })

    const platformStats = platformBreakdown.reduce((acc, item) => {
      acc[item.platform] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      totalUsers,
      totalStores,
      totalProducts,
      monthlyRevenue,
      activeSubscriptions: storeSubscriptions.length,
      platformStats,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}