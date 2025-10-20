import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync';

// GET shipping data for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shipping = await db.productShipping.findUnique({
      where: { productId: params.id }
    });

    return NextResponse.json({ shipping });
  } catch (error) {
    console.error('Error fetching shipping:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping data' },
      { status: 500 }
    );
  }
}

// PUT update or create shipping data
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
    const { weight, weightUnit, width, height, depth, dimensionUnit, fixedCost, freeShipping } = body;

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

    // Upsert shipping data
    const shipping = await db.productShipping.upsert({
      where: { productId: params.id },
      create: {
        productId: params.id,
        weight,
        weightUnit,
        width,
        height,
        depth,
        dimensionUnit,
        fixedCost,
        freeShipping: freeShipping || false
      },
      update: {
        weight,
        weightUnit,
        width,
        height,
        depth,
        dimensionUnit,
        fixedCost,
        freeShipping: freeShipping || false
      }
    });

    // Sync to BigCommerce if enabled
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncShippingToBigCommerce(
          params.id,
          shipping.id
        );
      } catch (error) {
        console.error('Failed to sync to BigCommerce:', error);
      }
    }

    return NextResponse.json({ shipping });
  } catch (error) {
    console.error('Error updating shipping:', error);
    return NextResponse.json(
      { error: 'Failed to update shipping data' },
      { status: 500 }
    );
  }
}