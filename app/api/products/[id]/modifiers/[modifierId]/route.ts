import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync';

// GET single modifier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; modifierId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modifier = await db.productModifier.findUnique({
      where: { id: params.modifierId }
    });

    if (!modifier) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });
    }

    return NextResponse.json({ modifier });
  } catch (error) {
    console.error('Error fetching modifier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifier' },
      { status: 500 }
    );
  }
}

// PUT update modifier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; modifierId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Verify modifier exists and user owns it
    const existing = await db.productModifier.findUnique({
      where: { id: params.modifierId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update modifier
    const updated = await db.productModifier.update({
      where: { id: params.modifierId },
      data: {
        name: body.name,
        displayName: body.displayName,
        type: body.type,
        required: body.required,
        values: body.values,
        validation: body.validation
      }
    });

    // Sync to BigCommerce if enabled
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncModifierToBigCommerce(
          params.id,
          params.modifierId
        );
      } catch (error) {
        console.error('Failed to sync to BigCommerce:', error);
      }
    }

    return NextResponse.json({ modifier: updated });
  } catch (error) {
    console.error('Error updating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier' },
      { status: 500 }
    );
  }
}

// DELETE modifier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; modifierId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify modifier exists and user owns it
    const existing = await db.productModifier.findUnique({
      where: { id: params.modifierId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete from BigCommerce first
    try {
      await BiDirectionalSyncService.deleteModifierFromBigCommerce(
        params.id,
        params.modifierId
      );
    } catch (error) {
      console.error('Failed to delete from BigCommerce:', error);
    }

    // Delete from database
    await db.productModifier.delete({
      where: { id: params.modifierId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting modifier:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier' },
      { status: 500 }
    );
  }
}