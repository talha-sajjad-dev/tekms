import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getShopifyAuthUrl, generateStateToken } from '@/lib/platforms/shopify/oauth'
import { canConnectStore } from '@/lib/auth/permissions'

/**
 * Initiate Shopify OAuth flow
 * POST /api/auth/connect/shopify
 * Body: { shop: "my-store.myshopify.com" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { shop } = await req.json()
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }
    
    // Check if user can connect another store
    const canConnect = await canConnectStore(session.user.id, 'SHOPIFY')
    
    if (!canConnect.allowed) {
      return NextResponse.json(
        { 
          error: canConnect.reason,
          limit: canConnect.limit,
          upgrade: true
        },
        { status: 403 }
      )
    }
    
    // Generate state token for CSRF protection
    const state = generateStateToken()
    
    // Store state in session/cookie for verification
    const response = NextResponse.json({
      success: true,
      message: 'Redirecting to Shopify for authorization'
    })
    
    // Store state token in cookie for later verification
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    // Store shop domain for callback
    response.cookies.set('shopify_shop', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10
    })
    
    // Generate OAuth URL
    const authUrl = await getShopifyAuthUrl(shop, state)
    
    // Return auth URL for client-side redirect
    return NextResponse.json({
      success: true,
      authUrl
    })
    
  } catch (error) {
    console.error('Shopify OAuth initiation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate Shopify connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}