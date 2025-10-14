import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookRequest } from '@/lib/webhooks/signature-verification'

/**
 * BigCommerce Webhook Receiver
 * Receives and stores webhook events from BigCommerce
 * 
 * Events handled:
 * - store/product/updated
 * - store/product/deleted
 * - store/product/inventory/updated
 * - store/order/created
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const headers = request.headers

    // Verify webhook signature
    const verification = await verifyWebhookRequest(headers, body, 'BIGCOMMERCE')
    
    if (!verification.valid) {
      console.error('BigCommerce webhook verification failed:', verification.error)
      return NextResponse.json(
        { error: 'Invalid webhook signature', details: verification.error },
        { status: 401 }
      )
    }

    // Parse the payload
    const payload = JSON.parse(body)
    
    // Extract store ID from query params
    const searchParams = request.nextUrl.searchParams
    const storeConnectionId = searchParams.get('storeId')

    if (!storeConnectionId) {
      console.error('No storeId provided in webhook URL')
      return NextResponse.json(
        { error: 'Missing storeId parameter' },
        { status: 400 }
      )
    }

    // Verify store connection exists
    const storeConnection = await db.storeConnection.findUnique({
      where: { id: storeConnectionId }
    })

    if (!storeConnection) {
      console.error('Store connection not found:', storeConnectionId)
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // Extract event type from payload
    const eventType = payload.scope || 'unknown'
    
    // Extract signature for storage
    const signature = headers.get('x-bc-webhook-signature')

    // Store webhook event in database
    const webhookEvent = await db.webhookEvent.create({
      data: {
        storeConnectionId,
        platform: 'BIGCOMMERCE',
        eventType,
        payload,
        signature: signature || undefined,
        processed: false,
        retryCount: 0
      }
    })

    console.log(`BigCommerce webhook received: ${eventType} (ID: ${webhookEvent.id})`)

    // Queue for processing (will be handled by event processors)
    // For now, we just store it and return success
    // Processing will happen via a separate background job or API call

    return NextResponse.json({
      success: true,
      eventId: webhookEvent.id,
      message: 'Webhook received and queued for processing'
    })

  } catch (error) {
    console.error('Error processing BigCommerce webhook:', error)
    
    // Return 200 to prevent BigCommerce from retrying
    // We'll handle the error internally
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}

// GET endpoint for webhook verification/health check
export async function GET() {
  return NextResponse.json({
    status: 'active',
    platform: 'BigCommerce',
    endpoint: '/api/webhooks/bigcommerce'
  })
}