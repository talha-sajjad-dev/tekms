import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get public settings (no auth required)
 * Used for maintenance page and public-facing info
 * GET /api/settings/public
 */
export async function GET() {
  try {
    const settings = await db.settings.findMany({
      where: {
        OR: [
          { key: { startsWith: 'general.maintenance' } },
          { key: 'website.name' },
          { key: 'website.logo_url' },
          { isPublic: true }
        ]
      },
      select: {
        key: true,
        value: true
      }
    })

    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      settings: settingsObject
    })
  } catch (error) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', settings: {} },
      { status: 500 }
    )
  }
}