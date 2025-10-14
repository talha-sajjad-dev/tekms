/**
 * Pricing Engine - Calculate dynamic prices based on rules
 * Supports per-channel markup, bulk pricing, and rule prioritization
 */

import { Platform } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { PricingRule } from '@prisma/client';

export type PricingRuleType = 
  | 'markup_percent'    // Add X% to base price
  | 'markup_fixed'      // Add $X to base price
  | 'set_price'         // Set price to $X
  | 'round_up'          // Round up to nearest X (e.g., .99)
  | 'round_down';       // Round down to nearest X

export interface PricingContext {
  basePrice: number | Decimal;
  productId?: string;
  tags?: string[];
  storeId?: string;
  platform?: Platform;
}

export interface CalculatedPrice {
  originalPrice: number;
  finalPrice: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    ruleType: PricingRuleType;
    value: number;
    priceAfter: number;
  }>;
  breakdown: string[];
}

export class PricingEngine {
  /**
   * Calculate final price by applying all matching rules
   */
  static calculatePrice(
    context: PricingContext,
    rules: PricingRule[]
  ): CalculatedPrice {
    const originalPrice = this.toNumber(context.basePrice);
    let currentPrice = originalPrice;
    const appliedRules: CalculatedPrice['appliedRules'] = [];
    const breakdown: string[] = [`Base price: $${originalPrice.toFixed(2)}`];

    // Filter and sort rules by priority (higher = applied first)
    const applicableRules = this.filterApplicableRules(rules, context)
      .sort((a, b) => b.priority - a.priority);

    // Apply each rule in priority order
    for (const rule of applicableRules) {
      const ruleType = this.getRuleType(rule, context.platform);
      const ruleValue = this.getRuleValue(rule, context.platform);
      const priceBefore = currentPrice;

      currentPrice = this.applyRule(currentPrice, ruleType, ruleValue);

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType,
        value: ruleValue,
        priceAfter: currentPrice,
      });

      breakdown.push(
        `${rule.name}: $${priceBefore.toFixed(2)} → $${currentPrice.toFixed(2)}`
      );
    }

    return {
      originalPrice,
      finalPrice: Math.round(currentPrice * 100) / 100, // Round to 2 decimals
      appliedRules,
      breakdown,
    };
  }

  /**
   * Filter rules that apply to this product/store/platform
   */
  private static filterApplicableRules(
    rules: PricingRule[],
    context: PricingContext
  ): PricingRule[] {
    return rules.filter(rule => {
      // Skip inactive rules
      if (!rule.isActive) return false;

      // Check scope
      if (rule.appliesTo === 'all') return true;

      if (rule.appliesTo === 'specific_stores' && context.storeId) {
        return rule.storeIds.includes(context.storeId);
      }

      if (rule.appliesTo === 'specific_products' && context.productId) {
        return rule.productIds.includes(context.productId);
      }

      if (rule.appliesTo === 'tagged' && context.tags) {
        return rule.tags.some((tag: string) => context.tags!.includes(tag));
      }

      return false;
    });
  }

  /**
   * Get rule type (check platform-specific overrides)
   */
  private static getRuleType(
    rule: PricingRule,
    platform?: Platform
  ): PricingRuleType {
    if (platform && rule.platformRules) {
      const platformRule = (rule.platformRules as any)[platform];
      if (platformRule?.type) {
        return platformRule.type as PricingRuleType;
      }
    }
    return rule.ruleType as PricingRuleType;
  }

  /**
   * Get rule value (check platform-specific overrides)
   */
  private static getRuleValue(
    rule: PricingRule,
    platform?: Platform
  ): number {
    if (platform && rule.platformRules) {
      const platformRule = (rule.platformRules as any)[platform];
      if (platformRule?.value !== undefined) {
        return this.toNumber(platformRule.value);
      }
    }
    return this.toNumber(rule.value);
  }

  /**
   * Apply a single pricing rule
   */
  private static applyRule(
    currentPrice: number,
    ruleType: PricingRuleType,
    value: number
  ): number {
    switch (ruleType) {
      case 'markup_percent':
        return currentPrice * (1 + value / 100);

      case 'markup_fixed':
        return currentPrice + value;

      case 'set_price':
        return value;

      case 'round_up':
        // Round up to nearest X (e.g., 0.99 → 24.99, 25.99, etc.)
        return Math.ceil(currentPrice) - (1 - value);

      case 'round_down':
        // Round down to nearest X
        return Math.floor(currentPrice / value) * value;

      default:
        return currentPrice;
    }
  }

  /**
   * Calculate prices for multiple products
   */
  static calculateBulkPrices(
    products: Array<{ id: string; basePrice: number | Decimal; tags?: string[] }>,
    rules: PricingRule[],
    storeId?: string,
    platform?: Platform
  ): Map<string, CalculatedPrice> {
    const results = new Map<string, CalculatedPrice>();

    for (const product of products) {
      const context: PricingContext = {
        basePrice: product.basePrice,
        productId: product.id,
        tags: product.tags,
        storeId,
        platform,
      };

      results.set(product.id, this.calculatePrice(context, rules));
    }

    return results;
  }

  /**
   * Preview price calculation for a single rule
   */
  static previewRule(
    basePrice: number | Decimal,
    ruleType: PricingRuleType,
    value: number
  ): { before: number; after: number; difference: number; percentChange: number } {
    const before = this.toNumber(basePrice);
    const after = this.applyRule(before, ruleType, value);
    const difference = after - before;
    const percentChange = ((after - before) / before) * 100;

    return {
      before: Math.round(before * 100) / 100,
      after: Math.round(after * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      percentChange: Math.round(percentChange * 100) / 100,
    };
  }

  /**
   * Validate rule configuration
   */
  static validateRule(
    ruleType: PricingRuleType,
    value: number
  ): { valid: boolean; error?: string } {
    if (value < 0 && ruleType !== 'markup_percent') {
      return { valid: false, error: 'Value cannot be negative' };
    }

    if (ruleType === 'markup_percent' && value < -100) {
      return { valid: false, error: 'Markup percent cannot be less than -100%' };
    }

    if (ruleType === 'set_price' && value <= 0) {
      return { valid: false, error: 'Set price must be greater than 0' };
    }

    if ((ruleType === 'round_up' || ruleType === 'round_down') && (value < 0 || value >= 1)) {
      return { valid: false, error: 'Round value must be between 0 and 1' };
    }

    return { valid: true };
  }

  /**
   * Helper: Convert Decimal or number to number
   */
  private static toNumber(value: number | Decimal): number {
    if (typeof value === 'number') return value;
    return parseFloat(value.toString());
  }

  /**
   * Get suggested round values
   */
  static getSuggestedRoundValues(): Array<{ label: string; value: number }> {
    return [
      { label: '.99 (e.g., $24.99)', value: 0.99 },
      { label: '.95 (e.g., $24.95)', value: 0.95 },
      { label: '.90 (e.g., $24.90)', value: 0.90 },
      { label: '.50 (e.g., $24.50)', value: 0.50 },
      { label: '.00 (e.g., $25.00)', value: 0.00 },
    ];
  }

  /**
   * Get rule type descriptions
   */
  static getRuleTypeDescriptions(): Record<PricingRuleType, string> {
    return {
      markup_percent: 'Add percentage to base price (e.g., +10% for Etsy)',
      markup_fixed: 'Add fixed amount to base price (e.g., +$5 shipping)',
      set_price: 'Override with specific price',
      round_up: 'Round up to nearest value (e.g., .99 endings)',
      round_down: 'Round down to nearest value (e.g., whole dollars)',
    };
  }
}