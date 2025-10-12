import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe/client'
import { db } from '@/lib/db'

/**
 * Create Stripe Setup Session for adding payment method
 * POST /api/stripe/create-setup-session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stripe = await getStripe()
    
    // Get or create Stripe customer
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        subscription: {
          select: {
            stripeCustomerId: true
          }
        }
      }
    })

    let customerId = user?.subscription?.stripeCustomerId

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email || session.user.email || undefined,
        name: user?.name || session.user.name || undefined,
        metadata: {
          userId: session.user.id
        }
      })

      customerId = customer.id

      // Save customer ID to database (upsert subscription)
      await db.subscription.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          stripeCustomerId: customerId,
          tier: 'FREE'
        },
        update: {
          stripeCustomerId: customerId
        }
      })
    }

    // Create setup session
    const setupSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXTAUTH_URL}/billing?setup=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?setup=cancelled`,
    })

    return NextResponse.json({
      sessionId: setupSession.id,
      url: setupSession.url
    })

  } catch (error) {
    console.error('Stripe setup session error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create payment setup session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}