import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET - Fetch user's saved filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filters = await db.savedFilter.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { isPinned: 'desc' },
        { isDefault: 'desc' },
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ filters })
  } catch (error) {
    console.error('Error fetching saved filters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new saved filter
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, filters, isPinned, isDefault } = body

    if (!name || !filters) {
      return NextResponse.json(
        { error: 'Name and filters are required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.savedFilter.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const savedFilter = await db.savedFilter.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        filters,
        isPinned: isPinned || false,
        isDefault: isDefault || false
      }
    })

    return NextResponse.json({ filter: savedFilter }, { status: 201 })
  } catch (error) {
    console.error('Error creating saved filter:', error)
    return NextResponse.json(
      { error: 'Failed to create filter' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete all saved filters (for cleanup)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await db.savedFilter.deleteMany({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved filters:', error)
    return NextResponse.json(
      { error: 'Failed to delete filters' },
      { status: 500 }
    )
  }
}