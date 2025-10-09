import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptCredentialObject } from '@/lib/encryption/credentials'

/**
 * GET /api/credentials/[id]
 * Get a specific credential (with decrypted data)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credential = await prisma.userCredential.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isActive: true,
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Decrypt the credentials
    const decryptedCredentials = decryptCredentialObject(credential.encryptedKey)

    return NextResponse.json({
      id: credential.id,
      platform: credential.platform,
      label: credential.label,
      credentials: decryptedCredentials,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching credential:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/credentials/[id]
 * Delete a credential (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credential = await prisma.userCredential.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Soft delete by marking as inactive
    await prisma.userCredential.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credential:', error)
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    )
  }
}