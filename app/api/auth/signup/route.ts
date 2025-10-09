import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (password field exists but Prisma types not yet updated)
    const user = await (prisma.user.create as any)({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(),
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

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: crypto.randomUUID(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    // Set session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('next-auth.session-token', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expires,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}