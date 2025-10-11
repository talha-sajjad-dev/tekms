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
    
    // If there's a store subscription, it should be cancelled
    // (We'll implement Stripe cancellation in Phase 5)
    if (store.storeSubscription) {
      // TODO: Cancel Stripe subscription
      await db.storeSubscription.delete({
        where: { id: store.storeSubscription.id }
      })
    }
    
    // Mark products as orphaned (keep data but disconnect from store)
    await db.product.updateMany({
      where: { storeConnectionId: params.id },
      data: { storeConnectionId: null }
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