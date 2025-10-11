import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleShopifyCallback } from '@/lib/platforms/shopify/oauth'

/**
 * Handle Shopify OAuth callback
 * GET /api/auth/callback/shopify?code=xxx&shop=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/?error=unauthorized', req.url)
      )
    }
    
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    
    if (!code || !shop || !state) {
      return NextResponse.redirect(
        new URL('/stores?error=missing_parameters', req.url)
      )
    }
    
    // Verify CSRF state token
    const storedState = req.cookies.get('shopify_oauth_state')?.value
    const storedShop = req.cookies.get('shopify_shop')?.value
    
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/stores?error=invalid_state', req.url)
      )
    }
    
    if (!storedShop || shop !== storedShop) {
      return NextResponse.redirect(
        new URL('/stores?error=shop_mismatch', req.url)
      )
    }
    
    // Exchange code for access token and create store connection
    const result = await handleShopifyCallback(code, shop, session.user.id)
    
    if (!result.success) {
      return NextResponse.redirect(
        new URL('/stores?error=connection_failed', req.url)
      )
    }
    
    // Clear state cookies
    const response = NextResponse.redirect(
      new URL(`/stores?success=true&store=${encodeURIComponent(result.storeName)}`, req.url)
    )
    
    response.cookies.delete('shopify_oauth_state')
    response.cookies.delete('shopify_shop')
    
    return response
    
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/stores?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, req.url)
    )
  }
}