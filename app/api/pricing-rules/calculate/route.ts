import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PricingEngine } from '@/lib/pricing/pricing-engine';

/**
 * POST /api/pricing-rules/calculate
 * Calculate price based on rules (preview without saving)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      basePrice,
      productId,
      tags,
      storeId,
      platform,
    } = body;

    if (!basePrice) {
      return NextResponse.json(
        { error: 'basePrice is required' },
        { status: 400 }
      );
    }

    // Get all active rules for the user
    const rules = await db.pricingRule.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Calculate the price
    const result = PricingEngine.calculatePrice(
      {
        basePrice: parseFloat(basePrice),
        productId,
        tags,
        storeId,
        platform,
      },
      rules
    );

    return NextResponse.json({
      success: true,
      calculation: result,
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}