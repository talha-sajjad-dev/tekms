import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { handleStripeWebhook, verifyWebhookSignature } from '@/lib/stripe/webhooks'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  try {
    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature, webhookSecret)

    // Handle the event
    const result = await handleStripeWebhook(event)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    )
  }
}