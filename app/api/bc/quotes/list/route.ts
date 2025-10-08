import { NextRequest, NextResponse } from 'next/server'
import { getQuotes } from '@/lib/bigcommerce-app/storage'

/**
 * Get all quotes for a store
 * GET /api/bc/quotes/list?store_hash=abc123
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const storeHash = searchParams.get('store_hash')
  
  if (!storeHash) {
    return NextResponse.json(
      { success: false, error: 'Store hash is required' },
      { status: 400 }
    )
  }
  
  try {
    const quotes = await getQuotes(storeHash)
    
    // Sort by creation date (newest first)
    quotes.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({
      success: true,
      quotes,
      total: quotes.length
    })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}