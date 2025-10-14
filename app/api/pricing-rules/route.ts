import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PricingEngine } from '@/lib/pricing/pricing-engine';

/**
 * GET /api/pricing-rules
 * List all pricing rules for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    const appliesTo = searchParams.get('appliesTo');

    const rules = await db.pricingRule.findMany({
      where: {
        userId: session.user.id,
        ...(isActive !== null && { isActive: isActive === 'true' }),
        ...(appliesTo && { appliesTo }),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Serialize Decimal fields
    const serializedRules = rules.map(rule => ({
      ...rule,
      value: rule.value.toString(),
    }));

    return NextResponse.json({
      success: true,
      rules: serializedRules,
      count: rules.length,
    });
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing-rules
 * Create a new pricing rule
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      appliesTo,
      storeIds = [],
      productIds = [],
      tags = [],
      ruleType,
      value,
      platformRules,
      isActive = true,
      priority = 0,
    } = body;

    // Validate required fields
    if (!name || !appliesTo || !ruleType || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, appliesTo, ruleType, value' },
        { status: 400 }
      );
    }

    // Validate rule configuration
    const validation = PricingEngine.validateRule(ruleType, parseFloat(value));
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate appliesTo scope
    const validScopes = ['all', 'specific_stores', 'specific_products', 'tagged'];
    if (!validScopes.includes(appliesTo)) {
      return NextResponse.json(
        { error: `Invalid appliesTo value. Must be one of: ${validScopes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate scope requirements
    if (appliesTo === 'specific_stores' && storeIds.length === 0) {
      return NextResponse.json(
        { error: 'storeIds required when appliesTo is "specific_stores"' },
        { status: 400 }
      );
    }

    if (appliesTo === 'specific_products' && productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds required when appliesTo is "specific_products"' },
        { status: 400 }
      );
    }

    if (appliesTo === 'tagged' && tags.length === 0) {
      return NextResponse.json(
        { error: 'tags required when appliesTo is "tagged"' },
        { status: 400 }
      );
    }

    // Create the pricing rule
    const rule = await db.pricingRule.create({
      data: {
        userId: session.user.id,
        name,
        description,
        appliesTo,
        storeIds,
        productIds,
        tags,
        ruleType,
        value: parseFloat(value),
        platformRules: platformRules || {},
        isActive,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        value: rule.value.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing rule' },
      { status: 500 }
    );
  }
}