import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all variants for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = params.id;

    const variants = await db.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    );
  }
}

// POST create new variant
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
        store: {
          userId: session.user.id
        }
      },
      include: {
        store: {
          include: {
            credentials: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create variant in database
    const variant = await db.productVariant.create({
      data: {
        productId,
        bigcommerceVariantId: body.bigcommerceVariantId,
        sku: body.sku,
        price: body.price,
        compareAtPrice: body.compareAtPrice,
        costPrice: body.costPrice,
        inventoryLevel: body.inventoryLevel || 0,
        inventoryTracking: body.inventoryTracking || 'none',
        weight: body.weight,
        weightUnit: body.weightUnit || 'lb',
        optionValues: body.optionValues || {},
        images: body.images || [],
        platformData: body.platformData || {}
      }
    });

    // If bigcommerceId exists, sync to BigCommerce
    if (product.bigcommerceId && body.syncToBigCommerce !== false) {
      await syncVariantToBigCommerce(product, variant);
    }

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 }
    );
  }
}

// Helper function to sync variant to BigCommerce
async function syncVariantToBigCommerce(product: any, variant: any) {
  try {
    const bcCredentials = product.store.credentials.find(
      (c: any) => c.platform === 'bigcommerce'
    );

    if (!bcCredentials) {
      throw new Error('BigCommerce credentials not found');
    }

    const apiUrl = `https://api.bigcommerce.com/stores/${bcCredentials.storeHash}/v3/catalog/products/${product.bigcommerceId}/variants`;

    const variantData = {
      sku: variant.sku,
      price: variant.price,
      cost_price: variant.costPrice,
      weight: variant.weight,
      inventory_level: variant.inventoryLevel,
      option_values: Object.entries(variant.optionValues || {}).map(
        ([optionId, valueId]) => ({
          option_id: parseInt(optionId),
          id: parseInt(valueId as string)
        })
      )
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Auth-Token': bcCredentials.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(variantData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('BigCommerce API error:', error);
      throw new Error(`Failed to sync variant to BigCommerce: ${error}`);
    }

    const result = await response.json();

    // Update variant with BigCommerce ID
    await db.productVariant.update({
      where: { id: variant.id },
      data: { bigcommerceVariantId: result.data.id.toString() }
    });

    return result.data;
  } catch (error) {
    console.error('Error syncing variant to BigCommerce:', error);
    throw error;
  }
}