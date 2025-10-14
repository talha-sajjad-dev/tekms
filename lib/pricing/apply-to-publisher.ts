import { PricingEngine } from './pricing-engine';
import { db } from '@/lib/db';
import type { PricingRule } from '@prisma/client';

/**
 * Apply pricing rules to a product for a specific channel
 */
export async function applyPricingRulesForChannel(
  masterProductId: string,
  userId: string,
  storeId: string,
  platform: string
): Promise<{
  basePrice: number;
  appliedRules: any[];
  finalPrice: number;
}> {
  // Get master product
  const masterProduct = await db.masterProduct.findFirst({
    where: { id: masterProductId, userId },
    select: {
      id: true,
      basePrice: true,
      tags: true,
    },
  });

  if (!masterProduct) {
    throw new Error('Master product not found');
  }

  // Get active pricing rules that apply to this product/store
  const pricingRules = await db.pricingRule.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { appliesTo: 'all' },
        { appliesTo: 'specific_stores', storeIds: { has: storeId } },
        { appliesTo: 'specific_products', productIds: { has: masterProductId } },
        { appliesTo: 'tagged', tags: { hasSome: masterProduct.tags } },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  const basePrice = Number(masterProduct.basePrice);

  if (pricingRules.length === 0) {
    return {
      basePrice,
      appliedRules: [],
      finalPrice: basePrice,
    };
  }

  // Calculate final price
  const calculation = PricingEngine.calculatePrice(
    {
      basePrice,
      productId: masterProductId,
      tags: masterProduct.tags,
      storeId,
      platform: platform as any,
    },
    pricingRules
  );

  console.log(`💰 Pricing rules applied for ${platform}:`);
  console.log(`   Base price: $${basePrice.toFixed(2)}`);
  console.log(`   Final price: $${calculation.finalPrice.toFixed(2)}`);
  console.log(`   Rules applied: ${calculation.appliedRules.length}`);

  return {
    basePrice,
    appliedRules: calculation.appliedRules,
    finalPrice: calculation.finalPrice,
  };
}

/**
 * Apply pricing rules to a variant price
 */
export function applyPricingRulesToVariant(
  variantPrice: number,
  productId: string,
  tags: string[],
  storeId: string,
  platform: string,
  rules: PricingRule[]
): number {
  if (rules.length === 0) {
    return variantPrice;
  }

  const calculation = PricingEngine.calculatePrice(
    {
      basePrice: variantPrice,
      productId,
      tags,
      storeId,
      platform: platform as any,
    },
    rules
  );

  return calculation.finalPrice;
}