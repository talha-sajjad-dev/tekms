import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET - Fetch user's background jobs
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status
    }

    const jobs = await db.bulkOperation.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const stats = await db.bulkOperation.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: true
    })

    const statusCounts = stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      jobs,
      stats: statusCounts
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}