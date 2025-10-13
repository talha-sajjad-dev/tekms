import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET - System health metrics (admin only)
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

    // Calculate sync health
    const [totalProducts, syncedProducts, errorProducts] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { syncStatus: 'synced' } }),
      db.product.count({ where: { syncStatus: 'error' } })
    ])

    const syncHealthValue = totalProducts > 0
      ? ((syncedProducts / totalProducts) * 100)
      : 100

    // Get recent sync errors
    const recentErrors = await db.product.findMany({
      where: {
        syncStatus: 'error',
        syncError: { not: null }
      },
      select: {
        syncError: true,
        updatedAt: true,
        platform: true,
        name: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    })

    const formattedErrors = recentErrors.map(e => ({
      message: e.syncError,
      timestamp: new Date(e.updatedAt).toLocaleString(),
      source: `${e.platform} - ${e.name}`
    }))

    return NextResponse.json({
      syncHealth: syncHealthValue,
      totalProducts,
      syncedProducts,
      errorProducts,
      recentErrors: formattedErrors,
      uptime: 99.9,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching health data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    )
  }
}