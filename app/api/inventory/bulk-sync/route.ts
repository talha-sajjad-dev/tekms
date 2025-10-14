import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryService } from '@/lib/inventory/inventory-service'

/**
 * POST /api/inventory/bulk-sync
 * Sync multiple products' inventory to all channels
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productIds } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Sync each product
    const allResults = []
    for (const productId of productIds) {
      const results = await InventoryService.syncToAllChannels(
        productId,
        session.user.id
      )
      allResults.push({
        productId,
        results
      })
    }

    // Calculate summary
    const totalSyncs = allResults.reduce((sum, item) => sum + item.results.length, 0)
    const successfulSyncs = allResults.reduce(
      (sum, item) => sum + item.results.filter(r => r.success).length,
      0
    )
    const failedSyncs = totalSyncs - successfulSyncs

    return NextResponse.json({
      success: failedSyncs === 0,
      productResults: allResults,
      summary: {
        productsProcessed: productIds.length,
        totalSyncs,
        successful: successfulSyncs,
        failed: failedSyncs
      }
    })

  } catch (error) {
    console.error('Error bulk syncing inventory:', error)
    return NextResponse.json(
      { error: 'Failed to bulk sync inventory' },
      { status: 500 }
    )
  }
}