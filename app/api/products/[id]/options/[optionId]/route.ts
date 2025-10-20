import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET single option
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const option = await db.productOption.findUnique({
      where: { id: params.optionId }
    });

    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    return NextResponse.json({ option });
  } catch (error) {
    console.error('Error fetching option:', error);
    return NextResponse.json(
      { error: 'Failed to fetch option' },
      { status: 500 }
    );
  }
}

// PUT update option
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, displayName, type, values } = body;

    // Verify option exists and user owns the product
    const existing = await db.productOption.findUnique({
      where: { id: params.optionId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update option
    const updated = await db.productOption.update({
      where: { id: params.optionId },
      data: { name, displayName, type, values }
    });

    return NextResponse.json({ option: updated });
  } catch (error) {
    console.error('Error updating option:', error);
    return NextResponse.json(
      { error: 'Failed to update option' },
      { status: 500 }
    );
  }
}

// DELETE option
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify option exists and user owns the product
    const existing = await db.productOption.findUnique({
      where: { id: params.optionId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete option
    await db.productOption.delete({
      where: { id: params.optionId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting option:', error);
    return NextResponse.json(
      { error: 'Failed to delete option' },
      { status: 500 }
    );
  }
}