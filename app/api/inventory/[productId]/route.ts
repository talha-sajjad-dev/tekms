import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryService } from '@/lib/inventory/inventory-service'

/**
 * GET /api/inventory/[productId]
 * Get inventory for specific product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = params
    const { searchParams } = new URL(request.url)
    const variantId = searchParams.get('variantId')

    const status = await InventoryService.getInventoryStatus(
      variantId ? undefined : productId,
      variantId || undefined,
      session.user.id
    )

    if (!status) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}