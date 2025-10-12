import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET all pricing tiers
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tiers = await db.storePricingTier.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { minProducts: 'asc' }
      ]
    })

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Error fetching pricing tiers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing tiers' },
      { status: 500 }
    )
  }
}

// POST create new pricing tier
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await req.json()

    const tier = await db.storePricingTier.create({
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

    return NextResponse.json({ tier }, { status: 201 })
  } catch (error) {
    console.error('Error creating pricing tier:', error)
    return NextResponse.json(
      { error: 'Failed to create pricing tier' },
      { status: 500 }
    )
  }
}