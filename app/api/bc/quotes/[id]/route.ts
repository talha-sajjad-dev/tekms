import { NextRequest, NextResponse } from 'next/server'
import { updateQuoteStatus, getQuoteById } from '@/lib/bigcommerce-app/storage'
import type { QuoteStatus } from '@/types/bigcommerce-app'

/**
 * Update quote status
 * PUT /api/bc/quotes/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const body = await request.json()
    const { status } = body as { status: QuoteStatus }
    
    if (!status || !['pending', 'contacted', 'completed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    const updatedQuote = await updateQuoteStatus(id, status)
    
    if (!updatedQuote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: 'Quote status updated successfully'
    })
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}

/**
 * Get single quote by ID
 * GET /api/bc/quotes/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const quote = await getQuoteById(id)
    
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      quote
    })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}