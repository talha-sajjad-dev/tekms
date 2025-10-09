import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptCredentialObject, decryptCredentialObject } from '@/lib/encryption/credentials'

const VALID_PLATFORMS = ['BIGCOMMERCE', 'TIKTOK', 'ETSY'] as const
type Platform = typeof VALID_PLATFORMS[number]

/**
 * GET /api/credentials
 * List all credentials for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credentials = await prisma.userCredential.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        label: true,
        createdAt: true,
        updatedAt: true,
        // Don't return encrypted keys
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ credentials })
  } catch (error) {
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credentials
 * Create a new credential
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { platform, label, credentials } = body

    // Validate input
    if (!platform || !credentials) {
      return NextResponse.json(
        { error: 'Platform and credentials are required' },
        { status: 400 }
      )
    }

    // Check if platform is valid
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Encrypt the credentials
    const encryptedKey = encryptCredentialObject(credentials)

    // Create the credential
    const credential = await prisma.userCredential.create({
      data: {
        userId: session.user.id,
        platform,
        label: label || null,
        encryptedKey,
      },
      select: {
        id: true,
        platform: true,
        label: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      credential 
    })
  } catch (error) {
    console.error('Error creating credential:', error)
    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 }
    )
  }
}