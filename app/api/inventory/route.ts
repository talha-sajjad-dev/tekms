import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/inventory
 * List inventory levels for all products
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const lowStockOnly = searchParams.get('lowStock') === 'true'
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
      trackInventory: true
    }

    // Get inventory levels
    const [inventoryLevels, total] = await Promise.all([
      db.inventoryLevel.findMany({
        where,
        include: {
          masterProduct: {
            select: {
              id: true,
              title: true,
              baseSKU: true,
              basePrice: true,
              status: true,
              images: true
            }
          },
          masterVariant: {
            select: {
              id: true,
              sku: true,
              optionValues: true,
              masterProduct: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      db.inventoryLevel.count({ where })
    ])

    // Filter low stock if requested
    let filteredLevels = inventoryLevels
    if (lowStockOnly) {
      filteredLevels = inventoryLevels.filter(
        (inv: any) => inv.available <= inv.lowStockThreshold
      )
    }

    // Format response
    const items = filteredLevels.map((inv: any) => {
      const product = inv.masterProduct || {
        id: inv.masterVariant?.masterProduct?.id,
        title: inv.masterVariant?.masterProduct?.title,
        sku: inv.masterVariant?.sku,
        variant: inv.masterVariant?.optionValues
      }

      return {
        id: inv.id,
        totalQuantity: inv.totalQuantity,
        allocated: inv.allocated,
        available: inv.available,
        lowStockThreshold: inv.lowStockThreshold,
        safetyStock: inv.safetyStock,
        trackInventory: inv.trackInventory,
        allowBackorder: inv.allowBackorder,
        channelAllocations: inv.channelAllocations,
        isLowStock: inv.available <= inv.lowStockThreshold,
        needsRestock: inv.available <= inv.safetyStock,
        product,
        updatedAt: inv.updatedAt
      }
    })

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total: lowStockOnly ? filteredLevels.length : total,
        totalPages: Math.ceil((lowStockOnly ? filteredLevels.length : total) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}