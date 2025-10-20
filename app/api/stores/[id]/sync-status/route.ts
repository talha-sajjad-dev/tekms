import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get sync job status for a store (Enhanced with stage tracking)
 * GET /api/stores/[id]/sync-status
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
    
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    
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
    
    // Get specific job or most recent
    const syncJob = jobId
      ? await db.syncJob.findFirst({
          where: {
            id: jobId,
            userId: session.user.id
          }
        })
      : await db.syncJob.findFirst({
          where: {
            userId: session.user.id,
            platform: store.platform,
            status: {
              in: ['processing', 'completed', 'failed', 'cancelled']
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
    
    if (!syncJob) {
      return NextResponse.json({
        status: 'idle',
        message: 'No sync in progress'
      })
    }
    
    const response: any = {
      jobId: syncJob.id,
      status: syncJob.status,
      totalItems: syncJob.totalItems,
      processedItems: syncJob.processedItems,
      failedItems: syncJob.failedItems,
      startedAt: syncJob.startedAt,
      completedAt: syncJob.completedAt,
      
      // Enhanced tracking
      isPaused: syncJob.isPaused,
      canPause: syncJob.status === 'processing' && !syncJob.isPaused,
      canResume: syncJob.status === 'processing' && syncJob.isPaused,
      canCancel: syncJob.status === 'processing',
      
      // Stages
      stages: syncJob.stages || [],
      currentStage: syncJob.currentStage,
      estimatedTimeRemaining: syncJob.estimatedTimeRemaining
    }
    
    // Add progress percentage
    if (syncJob.totalItems > 0) {
      response.progress = Math.round((syncJob.processedItems / syncJob.totalItems) * 100)
    } else if (syncJob.stages && Array.isArray(syncJob.stages)) {
      // Calculate progress from stages
      const stages = syncJob.stages as any[]
      const totalStages = stages.length
      const completedStages = stages.filter((s: any) => s.status === 'completed').length
      response.progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
    }
    
    // Add results if available
    if (syncJob.results) {
      response.results = syncJob.results
    }
    
    // Add error info
    if (syncJob.errorLog) {
      response.errorLog = syncJob.errorLog
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Sync status check error:', error)
    
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    )
  }
}