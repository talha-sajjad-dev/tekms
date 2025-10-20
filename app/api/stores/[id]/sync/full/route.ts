import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { FullSyncService } from '@/lib/sync/full-sync-service'

/**
 * Start full product sync
 * POST /api/stores/[id]/sync/full
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
    
    const { background = true } = await req.json().catch(() => ({ background: true }))
    
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
    
    if (!store.isActive) {
      return NextResponse.json(
        { error: 'Store is inactive' },
        { status: 400 }
      )
    }
    
    // Check for existing running job
    const existingJob = await db.syncJob.findFirst({
      where: {
        userId: session.user.id,
        platform: store.platform,
        status: 'processing'
      }
    })
    
    if (existingJob) {
      return NextResponse.json({
        success: false,
        error: 'A sync job is already running for this platform',
        jobId: existingJob.id
      }, { status: 409 })
    }
    
    // Create sync job
    const syncJob = await db.syncJob.create({
      data: {
        userId: session.user.id,
        platform: store.platform,
        action: 'full_sync',
        status: 'processing',
        startedAt: new Date()
      }
    })
    
    console.log(`🚀 Starting full sync for store ${store.storeName} (${store.platform})`)
    
    // Start sync in background
    if (background) {
      const syncService = new FullSyncService(syncJob.id, store)
      syncService.execute().catch(err => {
        console.error('Background sync error:', err)
      })
      
      return NextResponse.json({
        success: true,
        background: true,
        jobId: syncJob.id,
        message: 'Full sync started in background',
        stages: [
          'products',
          'variants',
          'modifiers',
          'options',
          'custom_fields',
          'seo',
          'shipping',
          'inventory',
          'bulk_pricing'
        ]
      })
    }
    
    // Execute sync and wait (for testing)
    const syncService = new FullSyncService(syncJob.id, store)
    await syncService.execute()
    
    return NextResponse.json({
      success: true,
      jobId: syncJob.id,
      message: 'Full sync completed'
    })
    
  } catch (error) {
    console.error('Full sync error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to start full sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}