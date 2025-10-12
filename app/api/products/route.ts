import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET user's products with advanced search and filtering
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const platform = searchParams.get('platform') || ''
    const storeId = searchParams.get('storeId') || ''
    const minPrice = searchParams.get('minPrice') || ''
    const maxPrice = searchParams.get('maxPrice') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      userId: session.user.id
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Platform filter
    if (platform && platform !== 'all') {
      where.platform = platform as any
    }

    // Store filter
    if (storeId && storeId !== 'all') {
      where.storeConnectionId = storeId
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) {
        where.price.gte = parseFloat(minPrice)
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice)
      }
    }

    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    // Fetch products with pagination
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          storeConnection: {
            select: {
              id: true,
              platform: true,
              storeName: true,
              storeUrl: true
            }
          }
        }
      }),
      db.product.count({ where })
    ])

    // Convert Decimal prices to numbers for JSON serialization
    const serializedProducts = products.map(product => ({
      ...product,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null
    }))

    return NextResponse.json({
      products: serializedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        pageSize: limit
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST bulk operations on products
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, productIds } = await req.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs required' },
        { status: 400 }
      )
    }

    // Verify user owns these products
    const ownedProducts = await db.product.count({
      where: {
        id: { in: productIds },
        userId: session.user.id
      }
    })

    if (ownedProducts !== productIds.length) {
      return NextResponse.json(
        { error: 'Unauthorized access to some products' },
        { status: 403 }
      )
    }

    let result
    switch (action) {
      case 'delete':
        result = await db.product.deleteMany({
          where: {
            id: { in: productIds },
            userId: session.user.id
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      affected: result.count
    })
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform operation' },
      { status: 500 }
    )
  }
}