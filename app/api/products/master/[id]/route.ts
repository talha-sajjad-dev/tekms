import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get a single master product
 * GET /api/products/master/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const product = await db.masterProduct.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' }
        },
        channelListings: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                storeName: true,
                storeUrl: true
              }
            },
            channelVariants: true
          }
        },
        template: true,
        inventoryLevels: true
      }
    })
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Serialize Decimal fields
    const serialized = {
      ...product,
      basePrice: Number(product.basePrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      variants: product.variants.map((v: any) => ({
        ...v,
        price: v.price ? Number(v.price) : null,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null
      })),
      channelListings: product.channelListings.map((cl: any) => ({
        ...cl,
        priceOverride: cl.priceOverride ? Number(cl.priceOverride) : null,
        channelVariants: cl.channelVariants.map((cv: any) => ({
          ...cv,
          platformPrice: cv.platformPrice ? Number(cv.platformPrice) : null
        }))
      })),
      template: product.template ? {
        ...product.template,
        basePrice: Number(product.template.basePrice),
        weight: product.template.weight ? Number(product.template.weight) : null
      } : null
    }
    
    return NextResponse.json({ product: serialized })
    
  } catch (error) {
    console.error('Error fetching master product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Update a master product
 * PATCH /api/products/master/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const {
      title,
      description,
      baseSKU,
      basePrice,
      compareAtPrice,
      category,
      tags,
      designIds,
      images,
      status
    } = body
    
    // Verify ownership
    const existing = await db.masterProduct.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Check SKU uniqueness if changed
    if (baseSKU && baseSKU !== existing.baseSKU) {
      const skuExists = await db.masterProduct.findFirst({
        where: {
          userId: session.user.id,
          baseSKU,
          NOT: { id: params.id }
        }
      })
      
      if (skuExists) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 409 }
        )
      }
    }
    
    // Update the product
    const updated = await db.masterProduct.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        baseSKU: baseSKU !== undefined ? baseSKU : undefined,
        basePrice: basePrice !== undefined ? basePrice : undefined,
        compareAtPrice: compareAtPrice !== undefined ? compareAtPrice : undefined,
        category: category !== undefined ? category : undefined,
        tags: tags !== undefined ? tags : undefined,
        designIds: designIds !== undefined ? designIds : undefined,
        images: images !== undefined ? images : undefined,
        status: status !== undefined ? status : undefined
      },
      include: {
        variants: true,
        channelListings: {
          include: {
            storeConnection: {
              select: {
                id: true,
                storeName: true,
                platform: true
              }
            }
          }
        }
      }
    })
    
    // Log the change
    await db.changeLog.create({
      data: {
        userId: session.user.id,
        entityType: 'product',
        entityId: params.id,
        field: 'master_product_update',
        oldValue: existing,
        newValue: updated,
        source: 'user'
      }
    }).catch(console.error)
    
    // Serialize
    const serialized = {
      ...updated,
      basePrice: Number(updated.basePrice),
      compareAtPrice: updated.compareAtPrice ? Number(updated.compareAtPrice) : null,
      variants: updated.variants.map((v: any) => ({
        ...v,
        price: v.price ? Number(v.price) : null,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null
      }))
    }
    
    return NextResponse.json({
      success: true,
      product: serialized
    })
    
  } catch (error) {
    console.error('Error updating master product:', error)
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Delete a master product
 * DELETE /api/products/master/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const product = await db.masterProduct.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        channelListings: true
      }
    })
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Check if product has channel listings
    if (product.channelListings.length > 0) {
      const publishedListings = product.channelListings.filter((cl: any) => cl.publishStatus === 'published')
      
      if (publishedListings.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete product with published listings',
            details: `This product is published on ${publishedListings.length} channel(s). Unpublish first or use force delete.`
          },
          { status: 409 }
        )
      }
    }
    
    // Delete the product (cascade will handle related records)
    await db.masterProduct.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting master product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}