import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryService } from '@/lib/inventory/inventory-service'

/**
 * POST /api/inventory/[productId]/sync
 * Sync inventory to all channels
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

    const results = await InventoryService.syncToAllChannels(
      productId,
      session.user.id
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    console.error('Error syncing inventory:', error)
    return NextResponse.json(
      { error: 'Failed to sync inventory' },
      { status: 500 }
    )
  }
}