import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PricingEngine } from '@/lib/pricing/pricing-engine';

/**
 * POST /api/pricing-rules/[id]/apply
 * Apply a pricing rule to products (bulk operation)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the pricing rule
    const rule = await db.pricingRule.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { productIds, dryRun = false } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
        { status: 400 }
      );
    }

    // Get the products
    const products = await db.masterProduct.findMany({
      where: {
        id: { in: productIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        baseSKU: true,
        basePrice: true,
        tags: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found' },
        { status: 404 }
      );
    }

    // Calculate new prices for each product
    const results = products.map((product: any) => {
      const calculation = PricingEngine.calculatePrice(
        {
          basePrice: product.basePrice,
          productId: product.id,
          tags: product.tags,
        },
        [rule]
      );

      return {
        productId: product.id,
        productTitle: product.title,
        baseSKU: product.baseSKU,
        currentPrice: Number(product.basePrice),
        newPrice: calculation.finalPrice,
        difference: calculation.finalPrice - Number(product.basePrice),
        breakdown: calculation.breakdown,
      };
    });

    // If not dry run, apply the price changes
    if (!dryRun) {
      const updates = results.map((result: any) =>
        db.masterProduct.update({
          where: { id: result.productId },
          data: { basePrice: result.newPrice },
        })
      );

      await Promise.all(updates);
    }

    return NextResponse.json({
      success: true,
      dryRun,
      applied: !dryRun,
      rule: {
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        value: rule.value.toString(),
      },
      results,
      summary: {
        totalProducts: results.length,
        averageIncrease: results.reduce((sum: number, r: any) => sum + r.difference, 0) / results.length,
        totalRevenueDelta: results.reduce((sum: number, r: any) => sum + r.difference, 0),
      },
    });
  } catch (error) {
    console.error('Error applying pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to apply pricing rule' },
      { status: 500 }
    );
  }
}