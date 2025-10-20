import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync';

// GET inventory data for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inventory = await db.productInventory.findMany({
      where: { productId: params.id }
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}

// PUT update inventory
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
    const { variantId, locationId, quantity, tracking, warningLevel } = body;

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

    // Upsert inventory
    const inventory = await db.productInventory.upsert({
      where: {
        productId_variantId_locationId: {
          productId: params.id,
          variantId: variantId || null,
          locationId: locationId || null
        }
      },
      create: {
        productId: params.id,
        variantId,
        locationId,
        quantity: quantity || 0,
        tracking: tracking || 'product',
        warningLevel: warningLevel || 5
      },
      update: {
        quantity: quantity || 0,
        tracking: tracking || 'product',
        warningLevel: warningLevel || 5
      }
    });

    // Sync to BigCommerce if enabled
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncInventoryToBigCommerce(
          params.id,
          inventory.id
        );
      } catch (error) {
        console.error('Failed to sync to BigCommerce:', error);
      }
    }

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory data' },
      { status: 500 }
    );
  }
}