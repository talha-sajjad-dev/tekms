import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get sync job status for a store
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
    
    // Get the most recent sync job for this store
    const syncJob = await db.syncJob.findFirst({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: {
          in: ['processing', 'completed', 'failed']
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
      completedAt: syncJob.completedAt
    }
    
    // Add progress percentage
    if (syncJob.totalItems > 0) {
      response.progress = Math.round((syncJob.processedItems / syncJob.totalItems) * 100)
    }
    
    // Add results if available
    if (syncJob.results) {
      response.results = syncJob.results
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