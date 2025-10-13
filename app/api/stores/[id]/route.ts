import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get store connection details
 * GET /api/stores/[id]
 */
export async function GET(
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
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        storeSubscription: {
          include: {
            pricingTier: true
          }
        }
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ store })
    
  } catch (error) {
    console.error('Failed to fetch store:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store details' },
      { status: 500 }
    )
  }
}

/**
 * Disconnect store
 * DELETE /api/stores/[id]
 */
export async function DELETE(
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
    
    // Verify ownership
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        storeSubscription: true
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    // If there's a store subscription, cancel it in Stripe first
    if (store.storeSubscription) {
      if (store.storeSubscription.stripeSubscriptionId) {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
          await stripe.subscriptions.cancel(store.storeSubscription.stripeSubscriptionId)
          console.log(`✅ Cancelled Stripe subscription: ${store.storeSubscription.stripeSubscriptionId}`)
        } catch (stripeError) {
          console.error('Failed to cancel Stripe subscription:', stripeError)
          // Continue with local deletion even if Stripe fails
        }
      }
      
      await db.storeSubscription.delete({
        where: { id: store.storeSubscription.id }
      })
    }
    
    // Delete all products from this store
    await db.product.deleteMany({
      where: { storeConnectionId: params.id }
    })
    
    // Delete store connection
    await db.storeConnection.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Failed to disconnect store:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect store' },
      { status: 500 }
    )
  }
}

/**
 * Update store connection
 * PATCH /api/stores/[id]
 */
export async function PATCH(
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
    
    const { isActive } = await req.json()
    
    const store = await db.storeConnection.update({
      where: {
        id: params.id,
        userId: session.user.id
      },
      data: {
        isActive: isActive !== undefined ? isActive : undefined
      }
    })
    
    return NextResponse.json({ store })
    
  } catch (error) {
    console.error('Failed to update store:', error)
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    )
  }
}