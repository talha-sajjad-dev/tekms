import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getShopInfo } from '@/lib/tiktok/api-client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth error
  if (error) {
    return NextResponse.redirect(
      new URL(`/tiktok-direct?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  // Validate state to prevent CSRF attacks
  // TODO: Implement state validation with session storage

  if (!code) {
    return NextResponse.redirect(
      new URL('/tiktok-direct?error=missing_code', request.url)
    )
  }

  try {
    // Exchange authorization code for access token
    console.log('🔐 Exchanging code for access token...')
    const tokenResponse = await getAccessToken(code)
    
    if (!tokenResponse.data?.access_token) {
      throw new Error('Failed to get access token')
    }

    const accessToken = tokenResponse.data.access_token
    const refreshToken = tokenResponse.data.refresh_token
    
    // Get shop information
    console.log('🏪 Fetching shop information...')
    const shopInfo = await getShopInfo(accessToken)
    
    // Store tokens in session/database
    // TODO: Implement secure token storage
    
    // Redirect back with success
    const redirectUrl = new URL('/tiktok-direct', request.url)
    redirectUrl.searchParams.set('oauth_success', 'true')
    redirectUrl.searchParams.set('shop_id', shopInfo.data?.shop_id || '')
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/tiktok-direct?error=oauth_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
}