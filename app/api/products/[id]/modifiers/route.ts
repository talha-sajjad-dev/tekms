import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all modifiers for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modifiers = await db.productModifier.findMany({
      where: { productId: params.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ modifiers });
  } catch (error) {
    console.error('Error fetching modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}

// POST create new modifier
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = params.id;
    const body = await request.json();

    // Validate product exists and user has access
    const product = await db.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create modifier in database
    const modifier = await db.productModifier.create({
      data: {
        productId,
        platform: product.platform,
        externalId: body.externalId || '',
        name: body.name,
        displayName: body.displayName,
        type: body.type,
        required: body.required || false,
        values: body.values || null,
        validation: body.validation || null,
        platformData: body.platformData || null
      }
    });

    return NextResponse.json({ modifier }, { status: 201 });
  } catch (error) {
    console.error('Error creating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier' },
      { status: 500 }
    );
  }
}