import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all options for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const options = await db.productOption.findMany({
      where: { productId: params.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
}

// POST create new option
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, displayName, type, values } = body;

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

    // Create option
    const option = await db.productOption.create({
      data: {
        productId: params.id,
        platform: product.platform,
        externalId: body.externalId || '',
        name,
        displayName,
        type,
        values
      }
    });

    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    console.error('Error creating option:', error);
    return NextResponse.json(
      { error: 'Failed to create option' },
      { status: 500 }
    );
  }
}