import Stripe from 'stripe'
import { db } from '@/lib/db'
import { getStripe } from './client'
import { sendEmail } from '@/lib/email/send'

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription)
    
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
    
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
    
    case 'invoice.payment_succeeded':
      return handlePaymentSucceeded(event.data.object as Stripe.Invoice)
    
    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice)
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
      return { received: true }
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const storeConnectionId = subscription.metadata.storeConnectionId
  
  if (!storeConnectionId) {
    console.error('No storeConnectionId in subscription metadata')
    return { error: 'Missing storeConnectionId' }
  }
  
  // Update store subscription status
  await db.storeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'ACTIVE' }
  })
  
  return { received: true }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = subscription.status === 'active' ? 'ACTIVE' :
                 subscription.status === 'past_due' ? 'PAST_DUE' :
                 subscription.status === 'canceled' ? 'CANCELED' : 'ACTIVE'
  
  await db.storeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status }
  })
  
  return { received: true }
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Mark subscription as canceled
  await db.storeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'CANCELED' }
  })
  
  // Optionally deactivate the store connection
  const storeConnectionId = subscription.metadata.storeConnectionId
  if (storeConnectionId) {
    await db.storeConnection.update({
      where: { id: storeConnectionId },
      data: { isActive: false }
    })
  }
  
  return { received: true }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return { received: true }
  
  const stripe = await getStripe()
  const subscription = typeof invoice.subscription === 'string'
    ? await stripe.subscriptions.retrieve(invoice.subscription)
    : invoice.subscription
  
  // Update subscription status to active
  await db.storeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'ACTIVE' }
  })
  
  // Send success email notification
  try {
    const storeSubscription = await db.storeSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: {
        storeConnection: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        },
        pricingTier: true
      }
    })
    
    if (storeSubscription?.storeConnection.user) {
      await sendEmail({
        to: storeSubscription.storeConnection.user.email,
        subject: 'Payment Successful - Subscription Active',
        template: 'payment_success',
        data: {
          userName: storeSubscription.storeConnection.user.name || 'Customer',
          storeName: storeSubscription.storeConnection.storeName,
          amount: (invoice.amount_paid / 100).toFixed(2),
          tierName: storeSubscription.pricingTier.name,
          periodEnd: new Date(subscription.current_period_end * 1000).toLocaleDateString()
        }
      }).catch(err => console.error('Failed to send payment success email:', err))
    }
  } catch (emailError) {
    console.error('Error sending payment success email:', emailError)
  }
  
  return { received: true }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return { received: true }
  
  const stripe = await getStripe()
  const subscription = typeof invoice.subscription === 'string'
    ? await stripe.subscriptions.retrieve(invoice.subscription)
    : invoice.subscription
  
  // Update subscription status
  await db.storeSubscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'PAST_DUE' }
  })
  
  // Send payment failed email notification
  try {
    const storeSubscription = await db.storeSubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: {
        storeConnection: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    })
    
    if (storeSubscription?.storeConnection.user) {
      await sendEmail({
        to: storeSubscription.storeConnection.user.email,
        subject: 'Payment Failed - Action Required',
        template: 'payment_failed',
        data: {
          userName: storeSubscription.storeConnection.user.name || 'Customer',
          storeName: storeSubscription.storeConnection.storeName,
          amount: (invoice.amount_due / 100).toFixed(2),
          attemptCount: invoice.attempt_count || 1,
          nextAttempt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
            : 'Soon'
        }
      }).catch(err => console.error('Failed to send payment failed email:', err))
    }
  } catch (emailError) {
    console.error('Error sending payment failed email:', emailError)
  }
  
  return { received: true }
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  const stripe = await getStripe()
  return stripe.webhooks.constructEvent(payload, signature, secret)
}