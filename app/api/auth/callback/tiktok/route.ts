import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleTikTokCallback } from '@/lib/platforms/tiktok/oauth'

/**
 * Handle TikTok Shop OAuth callback
 * GET /api/auth/callback/tiktok?code=xxx&state=xxx
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
    const storedState = req.cookies.get('tiktok_oauth_state')?.value
    
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/stores?error=invalid_state', req.url)
      )
    }
    
    // Exchange code for access token and create store connection
    const result = await handleTikTokCallback(code, session.user.id)
    
    if (!result.success) {
      return NextResponse.redirect(
        new URL('/stores?error=connection_failed', req.url)
      )
    }
    
    // Clear state cookie
    const response = NextResponse.redirect(
      new URL(`/stores?success=true&store=${encodeURIComponent(result.storeName)}`, req.url)
    )
    
    response.cookies.delete('tiktok_oauth_state')
    
    return response
    
  } catch (error) {
    console.error('TikTok OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/stores?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`, req.url)
    )
  }
}

/**
 * Handle TikTok verification/webhook POST requests
 * POST /api/auth/callback/tiktok
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📥 TikTok POST request received (verification or webhook)')
    const body = await req.json().catch(() => ({}))
    console.log('   Body:', body)
    
    // TikTok may send verification challenges
    // Return success to pass verification
    return NextResponse.json({
      success: true,
      message: 'Endpoint verified'
    }, { status: 200 })
    
  } catch (error) {
    console.error('TikTok POST handler error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}