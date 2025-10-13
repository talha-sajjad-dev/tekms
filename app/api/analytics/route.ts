import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET - Product analytics and insights
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all user's products for analytics
    const products = await db.product.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        platform: true,
        price: true,
        syncStatus: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const totalProducts = products.length

    // Calculate total value
    const totalValue = products.reduce((sum, p) => sum + Number(p.price), 0)

    // Calculate average price
    const avgPrice = totalProducts > 0 ? totalValue / totalProducts : 0

    // Platform breakdown
    const platformBreakdown = products.reduce((acc, p) => {
      acc[p.platform] = (acc[p.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Price ranges
    const priceRanges = {
      under25: products.filter(p => Number(p.price) < 25).length,
      range25to50: products.filter(p => Number(p.price) >= 25 && Number(p.price) <= 50).length,
      range50to100: products.filter(p => Number(p.price) > 50 && Number(p.price) <= 100).length,
      over100: products.filter(p => Number(p.price) > 100).length
    }

    // Sync health
    const syncHealth = {
      synced: products.filter(p => p.syncStatus === 'synced').length,
      errors: products.filter(p => p.syncStatus === 'error').length,
      pending: products.filter(p => !p.syncStatus || p.syncStatus === 'pending').length,
      total: totalProducts
    }

    // Trends (last 7 and 30 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const productsAddedLast7Days = products.filter(p => 
      new Date(p.createdAt) >= sevenDaysAgo
    ).length

    const productsAddedLast30Days = products.filter(p => 
      new Date(p.createdAt) >= thirtyDaysAgo
    ).length

    // Calculate price trend (simplified - comparing recent vs older products)
    const recentProducts = products.filter(p => new Date(p.createdAt) >= thirtyDaysAgo)
    const olderProducts = products.filter(p => new Date(p.createdAt) < thirtyDaysAgo)
    
    const recentAvg = recentProducts.length > 0
      ? recentProducts.reduce((sum, p) => sum + Number(p.price), 0) / recentProducts.length
      : avgPrice
    
    const olderAvg = olderProducts.length > 0
      ? olderProducts.reduce((sum, p) => sum + Number(p.price), 0) / olderProducts.length
      : avgPrice

    const avgPriceChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Get store-specific stats
    const storeStats = await db.storeConnection.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        id: true,
        platform: true,
        storeName: true,
        productCount: true,
        lastSyncedAt: true,
        syncStatus: true
      }
    })

    return NextResponse.json({
      totalProducts,
      totalValue,
      avgPrice,
      platformBreakdown,
      priceRanges,
      syncHealth,
      trends: {
        productsAddedLast7Days,
        productsAddedLast30Days,
        avgPriceChange
      },
      stores: storeStats,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}