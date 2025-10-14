import { NextRequest, NextResponse } from 'next/server'

/**
 * TikTok Shop Webhook Handler
 * POST /api/webhooks/tiktok
 * 
 * Handles webhook events from TikTok Shop:
 * - Order updates
 * - Product updates
 * - Inventory changes
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📥 TikTok Webhook received')
    
    const body = await req.json().catch(() => ({}))
    console.log('   Event type:', body.type || 'unknown')
    console.log('   Data:', JSON.stringify(body, null, 2))
    
    // TODO: Process webhook events
    // - Order created/updated
    // - Product updated
    // - Inventory changed
    
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    }, { status: 200 })
    
  } catch (error) {
    console.error('❌ TikTok webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * GET handler for TikTok webhook verification
 * TikTok may send GET requests to verify the endpoint exists
 */
export async function GET(req: NextRequest) {
  console.log('🔍 TikTok webhook verification (GET)')
  
  return NextResponse.json({
    success: true,
    message: 'TikTok webhook endpoint ready'
  }, { status: 200 })
}