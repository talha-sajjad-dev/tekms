import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/pages
 * Get published pages, optionally filtered for footer links
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const footerOnly = searchParams.get('footer') === 'true'
    
    const where: any = {
      isPublished: true
    }
    
    if (footerOnly) {
      where.isFooterLink = true
    }
    
    const pages = await db.page.findMany({
      where,
      select: {
        slug: true,
        title: true,
        displayOrder: true
      },
      orderBy: {
        displayOrder: 'asc'
      }
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