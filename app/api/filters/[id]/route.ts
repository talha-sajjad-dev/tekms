import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * PATCH - Update a saved filter
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, filters, isPinned, isDefault } = body

    // Verify ownership
    const existing = await db.savedFilter.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
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

    const updatedFilter = await db.savedFilter.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(filters !== undefined && { filters }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isDefault !== undefined && { isDefault })
      }
    })

    return NextResponse.json({ filter: updatedFilter })
  } catch (error) {
    console.error('Error updating saved filter:', error)
    return NextResponse.json(
      { error: 'Failed to update filter' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a saved filter
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before deleting
    const existing = await db.savedFilter.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    await db.savedFilter.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved filter:', error)
    return NextResponse.json(
      { error: 'Failed to delete filter' },
      { status: 500 }
    )
  }
}