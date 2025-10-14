import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAllCategoryMappings,
  createCategoryMapping,
  getCategoryStats,
} from '@/lib/categories/category-mapper';

/**
 * GET /api/category-mappings
 * List all category mappings for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const mappings = await getAllCategoryMappings(session.user.id);

    let stats = null;
    if (includeStats) {
      stats = await getCategoryStats(session.user.id);
    }

    return NextResponse.json({
      success: true,
      mappings,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching category mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category mappings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/category-mappings
 * Create a new category mapping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.keywords || body.keywords.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one keyword are required' },
        { status: 400 }
      );
    }

    // Validate pattern if provided
    if (body.pattern) {
      try {
        new RegExp(body.pattern, 'i');
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid regex pattern' },
          { status: 400 }
        );
      }
    }

    const mapping = await createCategoryMapping(session.user.id, {
      name: body.name,
      etsyTaxonomyId: body.etsyTaxonomyId,
      bcCategoryId: body.bcCategoryId,
      shopifyCollection: body.shopifyCollection,
      tiktokCategoryId: body.tiktokCategoryId,
      keywords: body.keywords,
      pattern: body.pattern,
    });

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('Error creating category mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create category mapping', details: error.message },
      { status: 500 }
    );
  }
}