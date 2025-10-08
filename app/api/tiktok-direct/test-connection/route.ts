import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/bigcommerce'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Test BigCommerce connection using existing integration
    try {
      await getProducts()
      console.log('✅ BigCommerce API connected successfully')
    } catch (bcError) {
      return NextResponse.json({
        success: false,
        error: 'BigCommerce API connection failed',
        details: bcError instanceof Error ? bcError.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // TODO: Implement TikTok API connection test once documentation is provided
    // For now, just validate that credentials are provided
    if (!config.tiktokApiKey || !config.tiktokApiSecret || !config.tiktokShopId) {
      return NextResponse.json({
        success: false,
        error: 'TikTok API credentials are incomplete',
        message: 'Please provide TikTok API Key, Secret, and Shop ID'
      }, { status: 400 })
    }
    
    // Placeholder for TikTok API test - will be implemented with actual API documentation
    return NextResponse.json({
      success: false,
      error: 'TikTok API implementation pending',
      message: 'BigCommerce API is connected. Please provide TikTok Shop API documentation to complete the integration',
      bigcommerceStatus: 'connected',
      tiktokStatus: 'pending_documentation'
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}