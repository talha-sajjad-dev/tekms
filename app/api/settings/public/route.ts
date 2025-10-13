import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/settings/service'

/**
 * GET /api/settings/public
 * Get all public-facing settings (no authentication required)
 */
export async function GET() {
  try {
    const settings = await getPublicSettings()
    
    return NextResponse.json({ 
      settings,
      cached: false // Can add caching later
    })
  } catch (error) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}