import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCategoryMapping,
  updateCategoryMapping,
  deleteCategoryMapping,
} from '@/lib/categories/category-mapper';

/**
 * GET /api/category-mappings/[id]
 * Get a specific category mapping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mapping = await getCategoryMapping(session.user.id, params.id);

    if (!mapping) {
      return NextResponse.json(
        { error: 'Category mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('Error fetching category mapping:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category mapping', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/category-mappings/[id]
 * Update a category mapping
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate pattern if provided
    if (body.pattern !== undefined && body.pattern !== null) {
      try {
        new RegExp(body.pattern, 'i');
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid regex pattern' },
          { status: 400 }
        );
      }
    }

    const mapping = await updateCategoryMapping(
      session.user.id,
      params.id,
      body
    );

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error: any) {
    console.error('Error updating category mapping:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Category mapping not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update category mapping', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/category-mappings/[id]
 * Delete a category mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteCategoryMapping(session.user.id, params.id);

    return NextResponse.json({
      success: true,
      message: 'Category mapping deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting category mapping:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Category mapping not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete category mapping', details: error.message },
      { status: 500 }
    );
  }
}