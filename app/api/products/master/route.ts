import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * Get master products with filtering and pagination
 * GET /api/products/master
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit
    
    // Filters
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build where clause
    const where: Prisma.MasterProductWhereInput = {
      userId: session.user.id
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { baseSKU: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (status) {
      where.status = status as any
    }
    
    if (category) {
      where.category = category
    }
    
    if (tags.length > 0) {
      where.tags = { hasSome: tags }
    }
    
    // Execute queries
    const [products, total] = await Promise.all([
      db.masterProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          variants: {
            take: 5,
            select: {
              id: true,
              sku: true,
              optionValues: true,
              price: true
            }
          },
          channelListings: {
            select: {
              id: true,
              platform: true,
              publishStatus: true,
              storeConnection: {
                select: {
                  id: true,
                  storeName: true
                }
              }
            }
          },
          template: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              variants: true,
              channelListings: true
            }
          }
        }
      }),
      db.masterProduct.count({ where })
    ])
    
    // Convert Decimal to number for JSON
    const serializedProducts = products.map((product: any) => ({
      ...product,
      basePrice: Number(product.basePrice),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      variants: product.variants.map((v: any) => ({
        ...v,
        price: v.price ? Number(v.price) : null
      }))
    }))
    
    return NextResponse.json({
      products: serializedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching master products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Create a new master product
 * POST /api/products/master
 */
export async function POST(req: NextRequest) {
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
      templateId,
      designIds,
      images,
      status,
      variants
    } = body
    
    // Validate required fields
    if (!title || !baseSKU || !basePrice) {
      return NextResponse.json(
        { error: 'Missing required fields: title, baseSKU, basePrice' },
        { status: 400 }
      )
    }
    
    // Check if SKU already exists
    const existingSKU = await db.masterProduct.findFirst({
      where: {
        userId: session.user.id,
        baseSKU: baseSKU
      }
    })
    
    if (existingSKU) {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 409 }
      )
    }
    
    // Create master product with variants in a transaction
    const masterProduct = await db.$transaction(async (tx) => {
      // Create the master product
      const product = await tx.masterProduct.create({
        data: {
          userId: session.user.id,
          title,
          description: description || null,
          baseSKU,
          basePrice,
          compareAtPrice: compareAtPrice || null,
          category: category || null,
          tags: tags || [],
          templateId: templateId || null,
          designIds: designIds || [],
          images: images || null,
          status: status || 'DRAFT'
        }
      })
      
      // Create variants if provided
      if (variants && Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
          await tx.masterVariant.create({
            data: {
              masterProductId: product.id,
              optionValues: variant.optionValues,
              sku: variant.sku,
              price: variant.price || null,
              compareAtPrice: variant.compareAtPrice || null,
              imageOverrides: variant.imageOverrides || []
            }
          })
        }
      }
      
      // Return product with variants
      return tx.masterProduct.findUnique({
        where: { id: product.id },
        include: {
          variants: true,
          template: true
        }
      })
    })
    
    // Serialize Decimal fields
    const serialized = {
      ...masterProduct,
      basePrice: Number(masterProduct!.basePrice),
      compareAtPrice: masterProduct!.compareAtPrice ? Number(masterProduct!.compareAtPrice) : null,
      variants: masterProduct!.variants.map((v: any) => ({
        ...v,
        price: v.price ? Number(v.price) : null,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null
      }))
    }
    
    return NextResponse.json({
      success: true,
      product: serialized
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating master product:', error)
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}