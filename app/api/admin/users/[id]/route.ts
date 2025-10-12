import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET single user details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        storeConnections: {
          include: {
            storeSubscription: {
              include: {
                pricingTier: true
              }
            }
          }
        },
        _count: {
          select: {
            products: true,
            storeConnections: true,
            credentials: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT update user
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    // Prevent admin from removing their own admin role
    if (params.id === session.user.id && data.role && data.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role' },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: {
        role: data.role,
        allowLegacyEtsyImport: data.allowLegacyEtsyImport ?? undefined,
        allowLegacyTikTokExport: data.allowLegacyTikTokExport ?? undefined
      },
      include: {
        subscription: true,
        _count: {
          select: {
            products: true,
            storeConnections: true
          }
        }
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent admin from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user has active subscriptions
    const subscriptions = await db.storeSubscription.count({
      where: {
        userId: params.id,
        status: 'ACTIVE'
      }
    })

    if (subscriptions > 0) {
      return NextResponse.json(
        { error: `User has ${subscriptions} active subscription(s). Cancel them first.` },
        { status: 400 }
      )
    }

    await db.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}