import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Resume paused sync job
 * POST /api/stores/[id]/sync/resume
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
    
    const { jobId } = await req.json()
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }
    
    // Verify job belongs to user
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
        { error: 'Can only resume processing jobs' },
        { status: 400 }
      )
    }
    
    if (!job.isPaused) {
      return NextResponse.json(
        { error: 'Job is not paused' },
        { status: 400 }
      )
    }
    
    // Update job to resume
    await db.syncJob.update({
      where: { id: jobId },
      data: { isPaused: false }
    })
    
    console.log(`▶️  Sync job ${jobId} resumed`)
    
    return NextResponse.json({
      success: true,
      message: 'Sync resumed successfully',
      resumedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error resuming sync:', error)
    return NextResponse.json(
      { 
        error: 'Failed to resume sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}