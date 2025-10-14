/**
 * Category Mapper Service
 * Intelligently maps products to platform-specific categories
 * Supports keyword matching, pattern matching, and learning from user corrections
 */

import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

export interface CategorySuggestion {
  mappingId: string;
  name: string;
  confidence: number;
  etsyTaxonomyId?: number;
  bcCategoryId?: number;
  shopifyCollection?: string;
  tiktokCategoryId?: string;
  matchReason: string;
  matchedKeywords?: string[];
  patternMatched?: boolean;
}

export interface CategoryMappingInput {
  name: string;
  etsyTaxonomyId?: number;
  bcCategoryId?: number;
  shopifyCollection?: string;
  tiktokCategoryId?: string;
  keywords: string[];
  pattern?: string;
}

// Helper: Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Common words to filter out from learning
const commonWords = [
  'the', 'and', 'for', 'with', 'this', 'that', 'from',
  'your', 'our', 'you', 'are', 'not', 'can', 'will',
  'has', 'have', 'been', 'more', 'all', 'new', 'custom',
  'best', 'great', 'perfect', 'amazing', 'unique', 'special',
];

/**
 * Auto-suggest categories based on product title and description
 */
export async function suggestCategories(
  userId: string,
  title: string,
  description?: string,
  platform?: Platform
): Promise<CategorySuggestion[]> {
  // Fetch all user's category mappings
  const mappings = await prisma.categoryMapping.findMany({
    where: { userId },
    orderBy: { timesUsed: 'desc' }, // Popular ones first
  });

  if (mappings.length === 0) {
    return [];
  }

  const suggestions: CategorySuggestion[] = [];
  const combinedText = `${title} ${description || ''}`.toLowerCase();

  for (const mapping of mappings) {
    let confidence = 0;
    const matchedKeywords: string[] = [];
    let patternMatched = false;
    const matchReasons: string[] = [];

    // 1. Keyword matching (weight: 40%)
    for (const keyword of mapping.keywords) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'gi');
      const matches = combinedText.match(regex);
      
      if (matches) {
        const keywordWeight = 40 / mapping.keywords.length;
        confidence += keywordWeight;
        matchedKeywords.push(keyword);
      }
    }

    // 2. Pattern matching (weight: 30%)
    if (mapping.pattern) {
      try {
        const pattern = new RegExp(mapping.pattern, 'i');
        if (pattern.test(combinedText)) {
          confidence += 30;
          patternMatched = true;
          matchReasons.push('pattern match');
        }
      } catch (e) {
        console.error(`Invalid regex pattern for mapping ${mapping.id}:`, e);
      }
    }

    // 3. Usage popularity bonus (weight: 20%)
    const popularityBonus = Math.min(20, (mapping.timesUsed / 10) * 20);
    confidence += popularityBonus;

    // 4. Exact title match bonus (weight: 10%)
    if (title.toLowerCase().includes(mapping.name.toLowerCase())) {
      confidence += 10;
      matchReasons.push('title contains category name');
    }

    // Only include if confidence is above threshold
    if (confidence >= 25) {
      if (matchedKeywords.length > 0) {
        matchReasons.push(`matched keywords: ${matchedKeywords.join(', ')}`);
      }

      // Cap confidence at 100
      confidence = Math.min(100, confidence);

      // Build platform-specific data
      const suggestion: CategorySuggestion = {
        mappingId: mapping.id,
        name: mapping.name,
        confidence: Math.round(confidence),
        matchReason: matchReasons.join('; '),
        matchedKeywords,
        patternMatched,
      };

      // Add platform-specific IDs if available
      if (mapping.etsyTaxonomyId) {
        suggestion.etsyTaxonomyId = mapping.etsyTaxonomyId;
      }
      if (mapping.bcCategoryId) {
        suggestion.bcCategoryId = mapping.bcCategoryId;
      }
      if (mapping.shopifyCollection) {
        suggestion.shopifyCollection = mapping.shopifyCollection;
      }
      if (mapping.tiktokCategoryId) {
        suggestion.tiktokCategoryId = mapping.tiktokCategoryId;
      }

      suggestions.push(suggestion);
    }
  }

  // Sort by confidence (highest first) and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Get category mapping by ID
 */
export async function getCategoryMapping(userId: string, mappingId: string) {
  return prisma.categoryMapping.findFirst({
    where: {
      id: mappingId,
      userId,
    },
  });
}

/**
 * Create a new category mapping
 */
export async function createCategoryMapping(
  userId: string,
  data: CategoryMappingInput
) {
  return prisma.categoryMapping.create({
    data: {
      userId,
      name: data.name,
      etsyTaxonomyId: data.etsyTaxonomyId,
      bcCategoryId: data.bcCategoryId,
      shopifyCollection: data.shopifyCollection,
      tiktokCategoryId: data.tiktokCategoryId,
      keywords: data.keywords,
      pattern: data.pattern,
    },
  });
}

/**
 * Update an existing category mapping
 */
export async function updateCategoryMapping(
  userId: string,
  mappingId: string,
  data: Partial<CategoryMappingInput>
) {
  return prisma.categoryMapping.update({
    where: {
      id: mappingId,
      userId,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.etsyTaxonomyId !== undefined && { etsyTaxonomyId: data.etsyTaxonomyId }),
      ...(data.bcCategoryId !== undefined && { bcCategoryId: data.bcCategoryId }),
      ...(data.shopifyCollection !== undefined && { shopifyCollection: data.shopifyCollection }),
      ...(data.tiktokCategoryId !== undefined && { tiktokCategoryId: data.tiktokCategoryId }),
      ...(data.keywords && { keywords: data.keywords }),
      ...(data.pattern !== undefined && { pattern: data.pattern }),
    },
  });
}

/**
 * Delete a category mapping
 */
export async function deleteCategoryMapping(userId: string, mappingId: string) {
  return prisma.categoryMapping.delete({
    where: {
      id: mappingId,
      userId,
    },
  });
}

/**
 * Increment usage count when a mapping is applied
 */
export async function recordMappingUsage(mappingId: string) {
  return prisma.categoryMapping.update({
    where: { id: mappingId },
    data: {
      timesUsed: { increment: 1 },
    },
  });
}

/**
 * Learn from user corrections
 * When a user manually selects a different category, update the mapping
 */
export async function learnFromCorrection(
  userId: string,
  productTitle: string,
  productDescription: string | undefined,
  selectedMappingId: string
) {
  const mapping = await getCategoryMapping(userId, selectedMappingId);
  if (!mapping) return;

  // Extract potential keywords from the product title
  const words = productTitle
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3) // Only words longer than 3 chars
    .filter(word => !commonWords.includes(word)); // Filter out common words

  // Find words not already in keywords
  const newKeywords = words.filter(word => !mapping.keywords.includes(word));

  if (newKeywords.length > 0) {
    // Add up to 2 new keywords from the product title
    const keywordsToAdd = newKeywords.slice(0, 2);
    
    await prisma.categoryMapping.update({
      where: { id: selectedMappingId },
      data: {
        keywords: {
          push: keywordsToAdd,
        },
      },
    });

    console.log(`Learned new keywords for "${mapping.name}":`, keywordsToAdd);
  }

  // Record usage
  await recordMappingUsage(selectedMappingId);
}

/**
 * Get category data for a specific platform
 */
export function getCategoryForPlatform(
  mapping: CategorySuggestion,
  platform: Platform
): string | number | null {
  switch (platform) {
    case 'ETSY':
      return mapping.etsyTaxonomyId || null;
    case 'BIGCOMMERCE':
      return mapping.bcCategoryId || null;
    case 'SHOPIFY':
      return mapping.shopifyCollection || null;
    case 'TIKTOK':
      return mapping.tiktokCategoryId || null;
    default:
      return null;
  }
}

/**
 * Apply category mapping to a product
 * Returns platform-specific category data
 */
export async function applyCategoryToProduct(
  userId: string,
  mappingId: string,
  platform: Platform
): Promise<{
  success: boolean;
  categoryData: any;
  error?: string;
}> {
  try {
    const mapping = await getCategoryMapping(userId, mappingId);
    
    if (!mapping) {
      return {
        success: false,
        categoryData: null,
        error: 'Category mapping not found',
      };
    }

    let categoryData: any = null;

    switch (platform) {
      case 'BIGCOMMERCE':
        if (mapping.bcCategoryId) {
          categoryData = { categoryId: mapping.bcCategoryId };
        }
        break;
      
      case 'SHOPIFY':
        if (mapping.shopifyCollection) {
          categoryData = { collection: mapping.shopifyCollection };
        }
        break;
      
      case 'ETSY':
        if (mapping.etsyTaxonomyId) {
          categoryData = { taxonomyId: mapping.etsyTaxonomyId };
        }
        break;
      
      case 'TIKTOK':
        if (mapping.tiktokCategoryId) {
          categoryData = { categoryId: mapping.tiktokCategoryId };
        }
        break;
    }

    if (!categoryData) {
      return {
        success: false,
        categoryData: null,
        error: `No category configured for ${platform}`,
      };
    }

    // Record usage
    await recordMappingUsage(mappingId);

    return {
      success: true,
      categoryData,
    };
  } catch (error: any) {
    return {
      success: false,
      categoryData: null,
      error: error.message,
    };
  }
}

/**
 * Get all category mappings for a user
 */
export async function getAllCategoryMappings(userId: string) {
  return prisma.categoryMapping.findMany({
    where: { userId },
    orderBy: [
      { timesUsed: 'desc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Test a pattern against sample text
 */
export function testPattern(pattern: string, text: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch (e) {
    throw new Error('Invalid regex pattern');
  }
}

/**
 * Get category statistics
 */
export async function getCategoryStats(userId: string) {
  const mappings = await getAllCategoryMappings(userId);
  
  const totalMappings = mappings.length;
  const totalUsage = mappings.reduce((sum: number, m: any) => sum + m.timesUsed, 0);
  const mostUsed = mappings[0]; // Already sorted by usage
  
  const platformCoverage = {
    etsy: mappings.filter((m: any) => m.etsyTaxonomyId).length,
    bigcommerce: mappings.filter((m: any) => m.bcCategoryId).length,
    shopify: mappings.filter((m: any) => m.shopifyCollection).length,
    tiktok: mappings.filter((m: any) => m.tiktokCategoryId).length,
  };

  return {
    totalMappings,
    totalUsage,
    mostUsed: mostUsed ? { name: mostUsed.name, timesUsed: mostUsed.timesUsed } : null,
    platformCoverage,
    averageKeywordsPerMapping: totalMappings > 0
      ? Math.round(mappings.reduce((sum: number, m: any) => sum + m.keywords.length, 0) / totalMappings)
      : 0,
  };
}