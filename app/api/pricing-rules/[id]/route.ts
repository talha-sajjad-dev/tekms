import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PricingEngine } from '@/lib/pricing/pricing-engine';

/**
 * GET /api/pricing-rules/[id]
 * Get a specific pricing rule
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        value: rule.value.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pricing-rules/[id]
 * Update a pricing rule
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if rule exists and belongs to user
    const existingRule = await db.pricingRule.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      appliesTo,
      storeIds,
      productIds,
      tags,
      ruleType,
      value,
      platformRules,
      isActive,
      priority,
    } = body;

    // Validate if ruleType and value are being updated
    if (ruleType !== undefined && value !== undefined) {
      const validation = PricingEngine.validateRule(ruleType, parseFloat(value));
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Update the rule
    const updatedRule = await db.pricingRule.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(storeIds !== undefined && { storeIds }),
        ...(productIds !== undefined && { productIds }),
        ...(tags !== undefined && { tags }),
        ...(ruleType !== undefined && { ruleType }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(platformRules !== undefined && { platformRules }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...updatedRule,
        value: updatedRule.value.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pricing-rules/[id]
 * Delete a pricing rule
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if rule exists and belongs to user
    const existingRule = await db.pricingRule.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      );
    }

    // Delete the rule
    await db.pricingRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pricing rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing rule' },
      { status: 500 }
    );
  }
}