import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Etsy Webhook Receiver (Placeholder)
 * Etsy webhook support to be implemented when API supports it
 * 
 * Note: Etsy's current API does not have comprehensive webhook support
 * This is a placeholder for future implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload = JSON.parse(body)
    
    // Extract store ID from query params
    const searchParams = request.nextUrl.searchParams
    const storeConnectionId = searchParams.get('storeId')

    if (!storeConnectionId) {
      return NextResponse.json(
        { error: 'Missing storeId parameter' },
        { status: 400 }
      )
    }

    // Store webhook event in database
    const webhookEvent = await db.webhookEvent.create({
      data: {
        storeConnectionId,
        platform: 'ETSY',
        eventType: 'unknown',
        payload,
        processed: false,
        retryCount: 0
      }
    })

    console.log(`Etsy webhook received (ID: ${webhookEvent.id})`)

    return NextResponse.json({
      success: true,
      eventId: webhookEvent.id,
      message: 'Webhook received (Etsy support coming soon)'
    })

  } catch (error) {
    console.error('Error processing Etsy webhook:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}

// GET endpoint for webhook verification/health check
export async function GET() {
  return NextResponse.json({
    status: 'placeholder',
    platform: 'Etsy',
    endpoint: '/api/webhooks/etsy',
    note: 'Etsy webhook support coming soon'
  })
}