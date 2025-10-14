import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { publishToBigCommerce } from '@/lib/publishers/bigcommerce-publisher'

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
        
        // For now, we only support BigCommerce
        // Later we'll add Shopify, Etsy, TikTok publishers
        const result = await publishToBigCommerce(
          params.id,
          storeId,
          session.user.id
        )
        
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