import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  suggestCategories,
  testPattern,
  learnFromCorrection,
} from '@/lib/categories/category-mapper';
import { Platform } from '@prisma/client';

/**
 * POST /api/category-mappings/suggest
 * Auto-suggest categories based on product title and description
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Product title is required' },
        { status: 400 }
      );
    }

    const suggestions = await suggestCategories(
      session.user.id,
      body.title,
      body.description,
      body.platform as Platform
    );

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    console.error('Error suggesting categories:', error);
    return NextResponse.json(
      { error: 'Failed to suggest categories', details: error.message },
      { status: 500 }
    );
  }
}