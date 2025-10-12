import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// PUT update pricing tier
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await req.json()

    const tier = await db.storePricingTier.update({
      where: { id: params.id },
      data: {
        name: data.name,
        minProducts: data.minProducts,
        maxProducts: data.maxProducts,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice || null,
        stripePriceId: data.stripePriceId || null,
        stripeYearlyPriceId: data.stripeYearlyPriceId || null,
        features: data.features || [],
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder || 0,
        description: data.description || null
      }
    })

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Error updating pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to update pricing tier' },
      { status: 500 }
    )
  }
}

// DELETE pricing tier
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if tier is in use
    const subscriptionsCount = await db.storeSubscription.count({
      where: { pricingTierId: params.id }
    })

    if (subscriptionsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete tier with ${subscriptionsCount} active subscription(s)` },
        { status: 400 }
      )
    }

    await db.storePricingTier.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to delete pricing tier' },
      { status: 500 }
    )
  }
}