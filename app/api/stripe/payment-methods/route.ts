import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe/client'
import { db } from '@/lib/db'

/**
 * Get user's payment methods from Stripe
 * GET /api/stripe/payment-methods
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stripe = await getStripe()
    
    // Get subscription with customer ID
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true }
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({
        paymentMethods: []
      })
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    })

    // Get default payment method from customer
    const customer = await stripe.customers.retrieve(subscription.stripeCustomerId)
    const defaultPaymentMethodId = !customer.deleted
      ? customer.invoice_settings?.default_payment_method
      : null

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId
      }))
    })

  } catch (error) {
    console.error('Fetch payment methods error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment methods',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}