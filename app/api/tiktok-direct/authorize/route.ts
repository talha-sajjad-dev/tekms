import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/tiktok/api-client'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Generate state for CSRF protection
    const state = randomBytes(16).toString('hex')
    
    // TODO: Store state in session for validation
    
    // Get redirect URI from environment or use default
    const redirectUri = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/tiktok-direct/callback`
      : `http://localhost:3000/api/tiktok-direct/callback`
    
    // Generate authorization URL
    const authUrl = getAuthorizationUrl(redirectUri, state)
    
    console.log('🔗 OAuth Configuration:')
    console.log('  App Key:', process.env.TIKTOK_CLIENT_ID || 'sbawlkhjww8r7sef4q')
    console.log('  Redirect URI:', redirectUri)
    console.log('  State:', state)
    console.log('  Auth URL:', authUrl)
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start OAuth flow',
        details: {
          app_key: process.env.TIKTOK_CLIENT_ID || 'sbawlkhjww8r7sef4q',
          redirect_uri: process.env.NEXTAUTH_URL
            ? `${process.env.NEXTAUTH_URL}/api/tiktok-direct/callback`
            : `http://localhost:3000/api/tiktok-direct/callback`
        }
      },
      { status: 500 }
    )
  }
}