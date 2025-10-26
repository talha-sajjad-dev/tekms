import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
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

    const fs = require('fs')
    const logFile = '/tmp/tekms-sync.log'
    const log = (msg: string) => {
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`)
    }
    
    if (body.syncToBigCommerce !== false) {
      try {
        await BiDirectionalSyncService.syncProductToBigCommerce(id)
      } catch (error) {
      }
    } else {
    }

    // Convert Decimal to number
    const serializedProduct = {
      ...updated,
      price: Number(updated.price),
      compareAtPrice: updated.compareAtPrice ? Number(updated.compareAtPrice) : null
    }

    return NextResponse.json({ product: serializedProduct })
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