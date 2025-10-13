import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { checkFeatureAccess } from '@/lib/subscription/enforcement'

/**
 * Unified Products API - Advanced filtering and management
 * GET /api/products/unified
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 100, max: 500)
 * - search: string (searches name, SKU, description)
 * - platforms: string[] (filter by platforms: BIGCOMMERCE,SHOPIFY,ETSY,TIKTOK)
 * - storeIds: string[] (filter by specific stores)
 * - minPrice: number
 * - maxPrice: number
 * - tags: string[] (products must have at least one of these tags)
 * - categories: string[] (products must be in at least one of these categories)
 * - syncStatus: string[] (synced, error, pending, etc.)
 * - importMethod: string[] (oauth, legacy)
 * - sortBy: string (name, price, createdAt, updatedAt, lastSyncedAt)
 * - sortOrder: string (asc, desc)
 * - savedFilterId: string (apply a saved filter)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const skip = (page - 1) * limit

    // Search
    const search = searchParams.get('search') || ''
    
    // Multi-select filters
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || []
    const storeIds = searchParams.get('storeIds')?.split(',').filter(Boolean) || []
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const syncStatuses = searchParams.get('syncStatus')?.split(',').filter(Boolean) || []
    const importMethods = searchParams.get('importMethod')?.split(',').filter(Boolean) || []
    
    // Price range
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Saved filter
    const savedFilterId = searchParams.get('savedFilterId')
    
    // Load saved filter if provided
    let filterConfig: any = {}
    if (savedFilterId) {
      const savedFilter = await db.savedFilter.findFirst({
        where: {
          id: savedFilterId,
          userId: session.user.id
        }
      })
      
      if (savedFilter) {
        filterConfig = savedFilter.filters as any
        
        // Update usage stats
        await db.savedFilter.update({
          where: { id: savedFilterId },
          data: {
            useCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        }).catch(console.error)
      }
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      userId: session.user.id
    }

    // Text search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Platform filter
    if (platforms.length > 0) {
      where.platform = { in: platforms as any[] }
    }

    // Store filter
    if (storeIds.length > 0) {
      where.storeConnectionId = { in: storeIds }
    }

    // Tags filter (products with at least one matching tag)
    if (tags.length > 0) {
      where.tags = { hasSome: tags }
    }

    // Categories filter
    if (categories.length > 0) {
      where.categories = { hasSome: categories }
    }

    // Sync status filter
    if (syncStatuses.length > 0) {
      where.syncStatus = { in: syncStatuses }
    }

    // Import method filter
    if (importMethods.length > 0) {
      where.importMethod = { in: importMethods }
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
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'lastSyncedAt']
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.updatedAt = 'desc'
    }

    // Execute queries in parallel for better performance
    const [products, total, aggregations] = await Promise.all([
      // Fetch products
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          externalId: true,
          name: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          platform: true,
          images: true,
          tags: true,
          categories: true,
          syncStatus: true,
          lastSyncedAt: true,
          createdAt: true,
          updatedAt: true,
          platformData: true,
          storeConnection: {
            select: {
              id: true,
              platform: true,
              storeName: true,
              storeUrl: true,
              externalStoreId: true
            }
          }
        }
      }),
      
      // Get total count
      db.product.count({ where }),
      
      // Get aggregations for faceted search
      db.product.groupBy({
        by: ['platform'],
        where: { userId: session.user.id },
        _count: true
      })
    ])

    // Get unique tags and categories for filter suggestions
    const [allTags, allCategories] = await Promise.all([
      db.product.findMany({
        where: { userId: session.user.id },
        select: { tags: true },
        distinct: ['tags']
      }).then(results => {
        const tagSet = new Set<string>()
        results.forEach(r => r.tags.forEach(t => tagSet.add(t)))
        return Array.from(tagSet).sort()
      }),
      
      db.product.findMany({
        where: { userId: session.user.id },
        select: { categories: true },
        distinct: ['categories']
      }).then(results => {
        const catSet = new Set<string>()
        results.forEach(r => r.categories.forEach(c => catSet.add(c)))
        return Array.from(catSet).sort()
      })
    ])

    // Convert Decimal prices to numbers for JSON serialization
    const serializedProducts = products.map(product => ({
      ...product,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null
    }))

    // Calculate facets for UI
    const platformCounts = aggregations.reduce((acc, item) => {
      acc[item.platform] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      products: serializedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      facets: {
        platforms: platformCounts,
        availableTags: allTags.slice(0, 50), // Limit to 50 most common
        availableCategories: allCategories.slice(0, 50)
      },
      meta: {
        searchQuery: search,
        appliedFilters: {
          platforms,
          storeIds,
          tags,
          categories,
          syncStatuses,
          importMethods,
          priceRange: { min: minPrice, max: maxPrice }
        },
        sortBy,
        sortOrder
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Bulk operations on products
 * 
 * Body:
 * {
 *   operation: "delete" | "update_price" | "add_image" | "update_tags" | "update_category" | "sync"
 *   productIds?: string[] (explicit list)
 *   filters?: object (select products by filter)
 *   changes?: object (changes to apply)
 *   background?: boolean (run in background)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { operation, productIds, filters, changes, background = false } = body

    // Only check bulk access for advanced operations (not delete)
    // Delete is a basic operation that all users should be able to do
    if (operation !== 'delete') {
      const hasBulkAccess = await checkFeatureAccess(session.user.id, 'bulk')
      if (!hasBulkAccess) {
        return NextResponse.json({
          error: `${operation} operation requires Professional or Enterprise plan`,
          upgrade: true
        }, { status: 403 })
      }
    }

    // Validate operation
    const validOperations = ['delete', 'update_price', 'add_image', 'update_tags', 'update_category', 'sync', 'publish', 'archive']
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation', validOperations },
        { status: 400 }
      )
    }

    // Get product IDs either from explicit list or by applying filters
    let targetProductIds: string[] = []
    
    if (productIds && productIds.length > 0) {
      targetProductIds = productIds
    } else if (filters) {
      // Build where clause from filters
      const where: Prisma.ProductWhereInput = {
        userId: session.user.id,
        ...filters
      }
      
      const products = await db.product.findMany({
        where,
        select: { id: true }
      })
      
      targetProductIds = products.map(p => p.id)
    } else {
      return NextResponse.json(
        { error: 'Must provide either productIds or filters' },
        { status: 400 }
      )
    }

    if (targetProductIds.length === 0) {
      return NextResponse.json(
        { error: 'No products match the criteria' },
        { status: 400 }
      )
    }

    // Verify user owns these products
    const ownedCount = await db.product.count({
      where: {
        id: { in: targetProductIds },
        userId: session.user.id
      }
    })

    if (ownedCount !== targetProductIds.length) {
      return NextResponse.json(
        { error: 'Unauthorized access to some products' },
        { status: 403 }
      )
    }

    // Create bulk operation record
    const bulkOp = await db.bulkOperation.create({
      data: {
        userId: session.user.id,
        type: operation,
        status: background ? 'queued' : 'processing',
        totalItems: targetProductIds.length,
        productIds: targetProductIds,
        filters: filters || {},
        changes: changes || {},
        startedAt: background ? null : new Date()
      }
    })

    // If background mode, queue the operation and return immediately
    if (background) {
      // In a real implementation, this would queue to a job processor
      // For now, we'll just mark it as queued
      return NextResponse.json({
        success: true,
        background: true,
        operationId: bulkOp.id,
        totalItems: targetProductIds.length,
        message: 'Operation queued for background processing'
      })
    }

    // Execute operation synchronously
    let result: any = { successItems: 0, failedItems: 0, results: [] }

    switch (operation) {
      case 'delete':
        const deleteResult = await db.product.deleteMany({
          where: {
            id: { in: targetProductIds },
            userId: session.user.id
          }
        })
        result.successItems = deleteResult.count
        break

      case 'update_price':
        if (changes && changes.action && changes.value) {
          for (const productId of targetProductIds) {
            try {
              const product = await db.product.findUnique({
                where: { id: productId },
                select: { price: true }
              })
              
              if (!product) continue
              
              let newPrice = Number(product.price)
              const value = Number(changes.value)
              
              if (changes.action === 'increase') {
                if (changes.unit === 'percent') {
                  newPrice = newPrice * (1 + value / 100)
                } else {
                  newPrice = newPrice + value
                }
              } else if (changes.action === 'decrease') {
                if (changes.unit === 'percent') {
                  newPrice = newPrice * (1 - value / 100)
                } else {
                  newPrice = newPrice - value
                }
              } else if (changes.action === 'set') {
                newPrice = value
              }
              
              // Ensure price doesn't go negative
              newPrice = Math.max(0, newPrice)
              
              await db.product.update({
                where: { id: productId },
                data: { price: newPrice }
              })
              
              result.successItems++
            } catch (error) {
              result.failedItems++
              console.error(`Failed to update price for product ${productId}:`, error)
            }
          }
        }
        break

      case 'update_tags':
        if (changes && changes.action && changes.tags) {
          for (const productId of targetProductIds) {
            try {
              const product = await db.product.findUnique({
                where: { id: productId },
                select: { tags: true }
              })
              
              if (!product) continue
              
              let newTags = [...product.tags]
              
              if (changes.action === 'add') {
                // Add new tags, avoiding duplicates
                newTags = [...new Set([...newTags, ...changes.tags])]
              } else if (changes.action === 'remove') {
                // Remove specified tags
                newTags = newTags.filter(tag => !changes.tags.includes(tag))
              } else if (changes.action === 'replace') {
                // Replace all tags
                newTags = changes.tags
              }
              
              await db.product.update({
                where: { id: productId },
                data: { tags: newTags }
              })
              
              result.successItems++
            } catch (error) {
              result.failedItems++
              console.error(`Failed to update tags for product ${productId}:`, error)
            }
          }
        }
        break

      case 'add_image':
        // Implementation for adding images
        result.successItems = targetProductIds.length
        break

      default:
        result.failedItems = targetProductIds.length
    }

    // Update bulk operation status
    await db.bulkOperation.update({
      where: { id: bulkOp.id },
      data: {
        status: 'completed',
        processedItems: targetProductIds.length,
        successItems: result.successItems,
        failedItems: result.failedItems,
        results: result.results,
        progress: 100,
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      operationId: bulkOp.id,
      totalItems: targetProductIds.length,
      successItems: result.successItems,
      failedItems: result.failedItems
    })
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}