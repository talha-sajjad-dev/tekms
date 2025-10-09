import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        grant_type: 'authorization_code'
      })
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    const googleUser = await userResponse.json()

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email }
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          emailVerified: new Date()
        }
      })

      // Create free subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          tier: 'FREE',
          status: 'ACTIVE'
        }
      })
    }

    // Create or update account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: googleUser.id
        }
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: googleUser.id,
        access_token: tokens.access_token,
        token_type: 'Bearer',
        scope: 'openid email profile'
      },
      update: {
        access_token: tokens.access_token
      }
    })

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: crypto.randomUUID(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })

    // Set cookie and redirect
    const response = NextResponse.redirect(new URL(state, req.url))
    response.cookies.set('next-auth.session-token', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expires,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url))
  }
}