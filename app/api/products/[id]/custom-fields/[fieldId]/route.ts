import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET single custom field
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customField = await db.productCustomField.findUnique({
      where: { id: params.fieldId }
    });

    if (!customField) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json({ customField });
  } catch (error) {
    console.error('Error fetching custom field:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom field' },
      { status: 500 }
    );
  }
}

// PUT update custom field
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, value } = body;

    // Verify custom field exists and user owns the product
    const existing = await db.productCustomField.findUnique({
      where: { id: params.fieldId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update custom field
    const updated = await db.productCustomField.update({
      where: { id: params.fieldId },
      data: { name, value }
    });

    return NextResponse.json({ customField: updated });
  } catch (error) {
    console.error('Error updating custom field:', error);
    return NextResponse.json(
      { error: 'Failed to update custom field' },
      { status: 500 }
    );
  }
}

// DELETE custom field
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify custom field exists and user owns the product
    const existing = await db.productCustomField.findUnique({
      where: { id: params.fieldId },
      include: {
        product: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    if (existing.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete custom field
    await db.productCustomField.delete({
      where: { id: params.fieldId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom field' },
      { status: 500 }
    );
  }
}