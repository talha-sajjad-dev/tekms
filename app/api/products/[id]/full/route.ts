import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Get product with all synced data
 * GET /api/products/[id]/full
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const product = await db.product.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        storeConnection: {
          select: {
            id: true,
            platform: true,
            storeName: true,
            storeUrl: true
          }
        },
        productVariants: {
          orderBy: { createdAt: 'asc' }
        },
        productModifiers: {
          orderBy: { createdAt: 'asc' }
        },
        productOptions: {
          orderBy: { createdAt: 'asc' }
        },
        productCustomFields: {
          orderBy: { name: 'asc' }
        },
        productSEO: true,
        productShipping: true,
        productInventory: {
          orderBy: { createdAt: 'asc' }
        },
        productBulkPricing: {
          orderBy: { minQuantity: 'asc' }
        },
        productReviews: true,
        crossListings: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ product })
    
  } catch (error) {
    console.error('Error fetching full product:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}