import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync';

// GET SEO data for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seo = await db.productSEO.findUnique({
      where: { productId: params.id }
    });

    return NextResponse.json({ seo });
  } catch (error) {
    console.error('Error fetching SEO:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO data' },
      { status: 500 }
    );
  }
}

// PUT update or create SEO data
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { metaTitle, metaDescription, searchKeywords, urlSlug } = body;

    // Verify product exists and user owns it
    const product = await db.product.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Upsert SEO data
    const seo = await db.productSEO.upsert({
      where: { productId: params.id },
      create: {
        productId: params.id,
        metaTitle,
        metaDescription,
        searchKeywords: searchKeywords || [],
        urlSlug
      },
      update: {
        metaTitle,
        metaDescription,
        searchKeywords: searchKeywords || [],
        urlSlug
      }
    });

    // Sync to BigCommerce if enabled
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncSEOToBigCommerce(
          params.id,
          seo.id
        );
      } catch (error) {
        console.error('Failed to sync to BigCommerce:', error);
      }
    }

    return NextResponse.json({ seo });
  } catch (error) {
    console.error('Error updating SEO:', error);
    return NextResponse.json(
      { error: 'Failed to update SEO data' },
      { status: 500 }
    );
  }
}