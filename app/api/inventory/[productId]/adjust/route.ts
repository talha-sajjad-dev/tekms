import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryService } from '@/lib/inventory/inventory-service'

/**
 * POST /api/inventory/[productId]/adjust
 * Manual inventory adjustment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = params
    const body = await request.json()
    const { adjustment, reason } = body

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { error: 'adjustment must be a number' },
        { status: 400 }
      )
    }

    const result = await InventoryService.adjustInventory(
      productId,
      adjustment,
      session.user.id,
      reason
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      newTotal: result.newTotal,
      newAvailable: result.newAvailable
    })

  } catch (error) {
    console.error('Error adjusting inventory:', error)
    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    )
  }
}