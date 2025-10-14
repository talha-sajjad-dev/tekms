import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryService } from '@/lib/inventory/inventory-service'

/**
 * GET /api/inventory/low-stock
 * Get products below threshold
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const lowStockItems = await InventoryService.getLowStockProducts(
      session.user.id,
      limit
    )

    // Format response
    const items = lowStockItems.map((inv: any) => ({
      id: inv.id,
      totalQuantity: inv.totalQuantity,
      allocated: inv.allocated,
      available: inv.available,
      lowStockThreshold: inv.lowStockThreshold,
      safetyStock: inv.safetyStock,
      needsRestock: inv.available <= inv.safetyStock,
      product: inv.masterProduct || {
        id: inv.masterVariant?.masterProduct?.id,
        title: inv.masterVariant?.masterProduct?.title,
        sku: inv.masterVariant?.sku,
        variant: inv.masterVariant?.optionValues
      }
    }))

    return NextResponse.json({
      success: true,
      items,
      count: items.length
    })

  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock products' },
      { status: 500 }
    )
  }
}