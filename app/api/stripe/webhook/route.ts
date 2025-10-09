import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Get subscription details
  if (session.subscription && typeof session.subscription === 'string') {
    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    await updateSubscriptionInDatabase(userId, subscription)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId || await getUserIdFromCustomer(subscription.customer as string)

  if (!userId) {
    console.error('No userId found for subscription')
    return
  }

  await updateSubscriptionInDatabase(userId, subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId || await getUserIdFromCustomer(subscription.customer as string)

  if (!userId) {
    console.error('No userId found for subscription')
    return
  }

  // Revert to FREE tier
  await prisma.subscription.update({
    where: { userId },
    data: {
      tier: 'FREE',
      status: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  })

  console.log(`Subscription deleted for user ${userId}, reverted to FREE tier`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice ${invoice.id}`)
  // You could send a receipt email here
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await getUserIdFromCustomer(invoice.customer as string)

  if (!userId) {
    console.error('No userId found for failed payment')
    return
  }

  // Update subscription status to PAST_DUE
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'PAST_DUE' },
  })

  console.log(`Payment failed for user ${userId}, status set to PAST_DUE`)
  // You could send a payment failed email here
}

async function updateSubscriptionInDatabase(userId: string, subscription: Stripe.Subscription) {
  // Determine tier from price ID
  const priceId = subscription.items.data[0]?.price.id
  const tier = getTierFromPriceId(priceId)
  
  const currentPeriodEnd = (subscription as any).current_period_end

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : null,
      tier,
      status: mapStripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  console.log(`Subscription updated for user ${userId}: tier=${tier}, status=${subscription.status}`)
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  })

  return subscription?.userId || null
}

function getTierFromPriceId(priceId?: string): 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' {
  if (!priceId) return 'FREE'

  // Map price IDs to tiers
  const { SUBSCRIPTION_TIERS } = require('@/lib/subscription/plans')

  if (priceId === SUBSCRIPTION_TIERS.STARTER.priceId) return 'STARTER'
  if (priceId === SUBSCRIPTION_TIERS.PROFESSIONAL.priceId) return 'PROFESSIONAL'
  if (priceId === SUBSCRIPTION_TIERS.ENTERPRISE.priceId) return 'ENTERPRISE'

  return 'FREE'
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'UNPAID' {
  const statusMap: Record<Stripe.Subscription.Status, any> = {
    'active': 'ACTIVE',
    'canceled': 'CANCELED',
    'incomplete': 'INCOMPLETE',
    'incomplete_expired': 'INCOMPLETE_EXPIRED',
    'past_due': 'PAST_DUE',
    'trialing': 'TRIALING',
    'unpaid': 'UNPAID',
    'paused': 'ACTIVE', // Map paused to active
  }

  return statusMap[stripeStatus] || 'ACTIVE'
}