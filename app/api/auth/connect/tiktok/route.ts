import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTikTokAuthUrl } from '@/lib/platforms/tiktok/oauth'
import { canConnectStore } from '@/lib/auth/permissions'
import crypto from 'crypto'

/**
 * Initiate TikTok Shop OAuth flow
 * POST /api/auth/connect/tiktok
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
    const canConnect = await canConnectStore(session.user.id, 'TIKTOK')
    
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
    const state = crypto.randomBytes(32).toString('hex')
    
    // Generate OAuth URL
    const authUrl = await getTikTokAuthUrl(state)
    
    // Store state in cookie
    const response = NextResponse.json({
      success: true,
      authUrl
    })
    
    response.cookies.set('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
    
    return response
    
  } catch (error) {
    console.error('TikTok OAuth initiation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initiate TikTok connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}