import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    console.log('🔐 Login attempt:', email)

    if (!email || !password) {
      console.log('❌ Missing credentials')
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      )
    }

    // Use raw query to bypass TypeScript types
    const users = await prisma.$queryRaw<Array<{
      id: string
      email: string
      name: string | null
      password: string | null
    }>>`
      SELECT id, email, name, password
      FROM "User"
      WHERE email = ${email}
    `

    const user = users[0]

    if (!user) {
      console.log('❌ User not found:', email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    if (!user.password) {
      console.log('❌ No password stored for user')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    console.log('🔑 Password valid:', isValid)

    if (!isValid) {
      console.log('❌ Invalid password')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ Password verified, creating session...')

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: crypto.randomUUID(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    console.log('✅ Session created:', session.sessionToken)

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      redirectUrl: '/dashboard'
    })
    
    response.cookies.set('next-auth.session-token', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expires,
      path: '/'
    })

    console.log('✅ Login successful!')
    return response
    
  } catch (error) {
    console.error('❌ Sign in error:', error)
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}