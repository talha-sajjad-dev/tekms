import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Cancel/Clear sync job (Enhanced with graceful cancellation)
 * POST /api/stores/[id]/sync/cancel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { jobId, reason } = await req.json().catch(() => ({}))
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    if (jobId) {
      // Cancel specific job
      const job = await db.syncJob.findFirst({
        where: {
          id: jobId,
          userId: session.user.id
        }
      })
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      
      if (job.status !== 'processing') {
        return NextResponse.json(
          { error: 'Can only cancel processing jobs' },
          { status: 400 }
        )
      }
      
      // Set cancel flag for graceful shutdown
      await db.syncJob.update({
        where: { id: jobId },
        data: {
          cancelRequested: true,
          cancellationReason: reason || 'User cancelled'
        }
      })
      
      console.log(`🛑 Cancel requested for sync job ${jobId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Cancel requested. Job will stop at next checkpoint.',
        jobId
      })
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
        message: 'No sync jobs found',
        clearedCount: 0
      })
    }
    
    // Request cancellation for all stuck jobs
    const result = await db.syncJob.updateMany({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      },
      data: {
        cancelRequested: true,
        cancellationReason: reason || 'User cancelled all jobs'
      }
    })
    
    console.log(`🧹 Requested cancellation for ${result.count} sync job(s) for ${store.platform}`)
    
    return NextResponse.json({
      success: true,
      message: `Cancellation requested for ${result.count} sync job(s)`,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: id,
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