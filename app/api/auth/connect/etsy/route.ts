import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEtsyAuthUrl, generateStateToken } from '@/lib/platforms/etsy/oauth'
import { canConnectStore } from '@/lib/auth/permissions'

/**
 * Initiate Etsy OAuth flow
 * POST /api/auth/connect/etsy
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
    
    // Check if user can connect another store
    const canConnect = await canConnectStore(session.user.id, 'ETSY')
    
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
    
    // Generate state token for CSRF protection (also used as PKCE verifier)
    const state = generateStateToken()
    
    // Generate OAuth URL
    const authUrl = await getEtsyAuthUrl(state)
    
    // Store state in cookie for verification
    const response = NextResponse.json({
      success: true,
      authUrl
    })
    
    response.cookies.set('etsy_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    return response
    
  } catch (error) {
    console.error('Etsy OAuth initiation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate Etsy connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}