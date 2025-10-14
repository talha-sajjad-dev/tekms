import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { publishToBigCommerce } from '@/lib/publishers/bigcommerce-publisher'
import { publishToShopify } from '@/lib/publishers/shopify-publisher'

/**
 * Publish master product to selected channels
 * POST /api/products/master/[id]/publish
 * 
 * Body:
 * {
 *   storeIds: string[]  // Store connection IDs to publish to
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { storeIds } = await req.json()
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json(
        { error: 'storeIds array is required' },
        { status: 400 }
      )
    }
    
    const results = []
    const errors = []
    
    // Publish to each store
    for (const storeId of storeIds) {
      try {
        console.log(`📤 Publishing to store ${storeId}...`)
        
        // Get store to determine platform
        const store = await db.storeConnection.findFirst({
          where: {
            id: storeId,
            userId: session.user.id
          }
        })
        
        if (!store) {
          errors.push({
            storeId,
            success: false,
            error: 'Store not found'
          })
          continue
        }
        
        // Call appropriate publisher based on platform
        let result: any
        switch (store.platform) {
          case 'BIGCOMMERCE':
            result = await publishToBigCommerce(params.id, storeId, session.user.id)
            break
          case 'SHOPIFY':
            result = await publishToShopify(params.id, storeId, session.user.id)
            break
          case 'ETSY':
            result = {
              success: false,
              error: 'Etsy publisher not yet implemented (coming soon)'
            }
            break
          case 'TIKTOK':
            result = {
              success: false,
              error: 'TikTok publisher not yet implemented (coming soon)'
            }
            break
          default:
            result = {
              success: false,
              error: `Unsupported platform: ${store.platform}`
            }
        }
        
        if (result.success) {
          results.push({
            storeId,
            success: true,
            externalId: result.externalId,
            details: result.details
          })
          console.log(`✅ Published to store ${storeId}`)
        } else {
          errors.push({
            storeId,
            success: false,
            error: result.error,
            details: result.details
          })
          console.error(`❌ Failed to publish to store ${storeId}:`, result.error)
        }
      } catch (error) {
        errors.push({
          storeId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Error publishing to store ${storeId}:`, error)
      }
    }
    
    const successCount = results.length
    const failureCount = errors.length
    
    // Return summary
    return NextResponse.json({
      success: successCount > 0,
      message: `Published to ${successCount} of ${storeIds.length} stores`,
      published: results,
      failed: errors,
      summary: {
        total: storeIds.length,
        succeeded: successCount,
        failed: failureCount
      }
    }, {
      status: errors.length === storeIds.length ? 500 : 200
    })
    
  } catch (error) {
    console.error('Error in publish endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to publish product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}