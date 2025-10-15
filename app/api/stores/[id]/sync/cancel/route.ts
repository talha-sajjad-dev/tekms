import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Cancel/Clear stuck sync job
 * POST /api/stores/[id]/sync/cancel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // Find any processing sync jobs for this platform
    const stuckJobs = await db.syncJob.findMany({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      }
    })
    
    if (stuckJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck sync jobs found',
        clearedCount: 0
      })
    }
    
    // Update all stuck jobs to cancelled
    const result = await db.syncJob.updateMany({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorLog: 'Manually cancelled by user'
      }
    })
    
    console.log(`🧹 Cleared ${result.count} stuck sync job(s) for ${store.platform}`)
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} stuck sync job(s)`,
      clearedCount: result.count
    })
    
  } catch (error) {
    console.error('Error cancelling sync job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to cancel sync job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get sync job status
 * GET /api/stores/[id]/sync/cancel
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // Get current sync job status
    const currentJob = await db.syncJob.findFirst({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (!currentJob) {
      return NextResponse.json({
        hasActiveJob: false,
        message: 'No active sync job'
      })
    }
    
    // Check if job is actually stuck (running for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - (30 * 60 * 1000))
    const isStuck = currentJob.startedAt && currentJob.startedAt < thirtyMinutesAgo
    
    return NextResponse.json({
      hasActiveJob: true,
      isStuck,
      job: {
        id: currentJob.id,
        status: currentJob.status,
        totalItems: currentJob.totalItems,
        processedItems: currentJob.processedItems,
        startedAt: currentJob.startedAt,
        platform: currentJob.platform
      }
    })
    
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}