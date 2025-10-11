import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleEtsyCallback } from '@/lib/platforms/etsy/oauth'

/**
 * Handle Etsy OAuth callback
 * GET /api/auth/callback/etsy?code=xxx&state=xxx
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
    const state = searchParams.get('state')
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/stores?error=missing_parameters', req.url)
      )
    }
    
    // Verify CSRF state token
    const storedState = req.cookies.get('etsy_oauth_state')?.value
    
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/stores?error=invalid_state', req.url)
      )
    }
    
    // Exchange code for access token and create store connection
    // Use state as PKCE code verifier
    const result = await handleEtsyCallback(code, session.user.id, state)
    
    if (!result.success) {
      return NextResponse.redirect(
        new URL('/stores?error=connection_failed', req.url)
      )
    }
    
    // Clear state cookie
    const response = NextResponse.redirect(
      new URL(`/stores?success=true&store=${encodeURIComponent(result.storeName)}`, req.url)
    )
    
    response.cookies.delete('etsy_oauth_state')
    
    return response
    
  } catch (error) {
    console.error('Etsy OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/stores?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, req.url)
    )
  }
}