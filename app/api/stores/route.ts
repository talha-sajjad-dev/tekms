import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get user's store connections
 * GET /api/stores
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const stores = await db.storeConnection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        platform: true,
        storeName: true,
        storeUrl: true,
        productCount: true,
        isActive: true,
        syncStatus: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ stores })
    
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}