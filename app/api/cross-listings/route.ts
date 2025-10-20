import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all cross-listings for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const crossListings = await db.crossListing.findMany({
      where: {
        sourceProduct: {
          userId: session.user.id
        }
      },
      include: {
        sourceProduct: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ crossListings });
  } catch (error) {
    console.error('Error fetching cross-listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-listings' },
      { status: 500 }
    );
  }
}

// POST create new cross-listing
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sourceProductId,
      targetStoreId,
      targetPlatform,
      titleTemplate,
      descriptionTemplate,
      priceAdjustment,
      categoryMapping,
      tagMapping
    } = body;

    // Verify user owns the source product
    const sourceProduct = await db.product.findFirst({
      where: {
        id: sourceProductId,
        userId: session.user.id
      }
    });

    if (!sourceProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create cross-listing
    const crossListing = await db.crossListing.create({
      data: {
        sourceProductId,
        targetStoreId,
        targetPlatform,
        status: 'draft',
        titleTemplate: titleTemplate || sourceProduct.name,
        descriptionTemplate: descriptionTemplate || sourceProduct.description,
        priceAdjustment: priceAdjustment || {},
        categoryMapping: categoryMapping || {},
        tagMapping: tagMapping || {}
      }
    });

    return NextResponse.json({ crossListing }, { status: 201 });
  } catch (error) {
    console.error('Error creating cross-listing:', error);
    return NextResponse.json(
      { error: 'Failed to create cross-listing' },
      { status: 500 }
    );
  }
}