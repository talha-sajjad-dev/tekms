import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createCheckoutSession } from '@/lib/stripe/client'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription/plans'

/**
 * POST /api/stripe/checkout
 * Create a Stripe checkout session for subscription
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { tier } = body

    // Validate tier
    if (!tier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
    
    if (!tierConfig.priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this tier' },
        { status: 500 }
      )
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email!,
      tierConfig.priceId,
      `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}