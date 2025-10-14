import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProcessorRegistry } from '@/lib/webhooks/processors/base-processor'

/**
 * Retry failed webhook event
 * POST /api/webhooks/events/[id]/retry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Get the event
    const event = await db.webhookEvent.findUnique({
      where: { id },
      include: {
        storeConnection: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify user owns this event
    if (event.storeConnection?.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Reset processed status
    await db.webhookEvent.update({
      where: { id },
      data: {
        processed: false,
        processedAt: null,
        processingError: null
      }
    })

    // Process the event
    const result = await ProcessorRegistry.processEvent(id)

    return NextResponse.json({
      success: result.success,
      error: result.error,
      changes: result.changes?.length || 0
    })

  } catch (error) {
    console.error('Error retrying webhook event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}