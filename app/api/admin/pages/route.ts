import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pages = await db.page.findMany({
      orderBy: [
        { isFooterLink: 'desc' },
        { displayOrder: 'asc' },
        { title: 'asc' }
      ]
    })

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      slug,
      title,
      content,
      metaTitle,
      metaDescription,
      isPublished,
      isFooterLink,
      displayOrder
    } = body

    // Check if slug already exists
    const existing = await db.page.findUnique({
      where: { slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 400 }
      )
    }

    const page = await db.page.create({
      data: {
        slug,
        title,
        content,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        isPublished,
        isFooterLink,
        displayOrder,
        updatedBy: session.user.id
      }
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }
}