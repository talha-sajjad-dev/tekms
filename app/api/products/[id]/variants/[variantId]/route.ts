import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync';

// GET single variant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const variant = await db.productVariant.findUnique({
      where: { id: params.variantId }
    });

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ variant });
  } catch (error) {
    console.error('Error fetching variant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variant' },
      { status: 500 }
    );
  }
}

// PUT update variant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sku, price, compareAtPrice, costPrice, inventoryLevel, weight, weightUnit, optionValues } = body;

    // Verify variant exists
    const existing = await db.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    // Verify user owns this product
    if (existing.product.storeConnection?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update variant in database
    const updated = await db.productVariant.update({
      where: { id: params.variantId },
      data: {
        sku,
        price,
        compareAtPrice,
        costPrice,
        inventoryLevel,
        weight,
        weightUnit,
        optionValues: optionValues || existing.optionValues
      }
    });

    // Sync to BigCommerce if enabled
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncVariantToBigCommerce(
          params.id,
          params.variantId
        );
      } catch (error) {
        console.error('Failed to sync to BigCommerce:', error);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ variant: updated });
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

// DELETE variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify variant exists and user owns it
    const existing = await db.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    if (existing.product.storeConnection?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete from BigCommerce first
    try {
      await BiDirectionalSyncService.deleteVariantFromBigCommerce(
        params.id,
        params.variantId
      );
    } catch (error) {
      console.error('Failed to delete from BigCommerce:', error);
      // Continue with local deletion even if BC deletion fails
    }

    // Delete from database
    await db.productVariant.delete({
      where: { id: params.variantId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 }
    );
  }
}