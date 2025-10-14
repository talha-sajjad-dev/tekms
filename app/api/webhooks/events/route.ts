import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * List webhook events
 * GET /api/webhooks/events?platform=BIGCOMMERCE&processed=false&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform')
    const processedStr = searchParams.get('processed')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    
    if (platform) {
      where.platform = platform
    }

    if (processedStr !== null) {
      where.processed = processedStr === 'true'
    }

    // Get user's store connections to filter events
    const storeConnections = await db.storeConnection.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })

    const storeIds = storeConnections.map(s => s.id)
    
    if (storeIds.length > 0) {
      where.storeConnectionId = { in: storeIds }
    } else {
      // User has no stores, return empty
      return NextResponse.json({
        events: [],
        total: 0,
        limit,
        offset
      })
    }

    // Get total count
    const total = await db.webhookEvent.count({ where })

    // Get events
    const events = await db.webhookEvent.findMany({
      where,
      include: {
        storeConnection: {
          select: {
            id: true,
            storeName: true,
            platform: true
          }
        }
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      events,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching webhook events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}