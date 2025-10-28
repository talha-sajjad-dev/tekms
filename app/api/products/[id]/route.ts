import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { BiDirectionalSyncService } from '@/lib/sync/bidirectional-sync'

// GET single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await db.product.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        storeConnection: {
          select: {
            id: true,
            platform: true,
            storeName: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Convert Decimal to number
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null
    }

    return NextResponse.json({ product: serializedProduct })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PATCH update product
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, sku, price, compareAtPrice } = body

    const existing = await db.product.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        storeConnection: true
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const updated = await db.product.update({
      where: { id: id },
      data: {
        name,
        description,
        sku,
        price,
        compareAtPrice
      }
    })

    let bcSyncResult = null
    if (existing.platform === 'BIGCOMMERCE' && existing.storeConnection) {
      try {
        
        const accessToken = decrypt(existing.storeConnection.accessToken)
        const storeHash = existing.storeConnection.externalStoreId
        
        const bcUpdatePayload: any = {
          name: name || existing.name,
          description: description || existing.description,
          price: price || existing.price
        }

        if (sku && sku.trim() !== '') {
          bcUpdatePayload.sku = sku
        }

        if (compareAtPrice && compareAtPrice > 0) {
          bcUpdatePayload.retail_price = compareAtPrice
        }

        const bcResponse = await fetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${existing.externalId}`,
          {
            method: 'PUT',
            headers: {
              'X-Auth-Token': accessToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(bcUpdatePayload)
          }
        )

        if (!bcResponse.ok) {
          const errorData = await bcResponse.json().catch(() => ({}))
          bcSyncResult = {
            success: false,
            error: `BigCommerce API error: ${bcResponse.status}`,
            details: errorData
          }
        } else {
          const bcResult = await bcResponse.json()
          bcSyncResult = {
            success: true,
            details: bcResult.data
          }
        }
      } catch (bcError) {
        bcSyncResult = {
          success: false,
          error: bcError instanceof Error ? bcError.message : 'Unknown error'
        }
      }
    }

    // Remove the fs logging code as it's not needed in production
    
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncProductToBigCommerce(id);
      } catch (error) {
        console.error('Sync to BigCommerce failed:', error);
      }
    }

    // Convert Decimal to number
    const serializedProduct = {
      ...updated,
      price: Number(updated.price),
      compareAtPrice: updated.compareAtPrice ? Number(updated.compareAtPrice) : null
    }

    return NextResponse.json({ 
      product: serializedProduct,
      syncResult: bcSyncResult
    });
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existing = await db.product.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await db.product.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}