import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Toggle maintenance mode
 * POST /api/admin/maintenance
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { enabled } = await req.json()
    
    // Update database setting
    await db.settings.upsert({
      where: { key: 'general.maintenance_mode' },
      create: {
        key: 'general.maintenance_mode',
        value: enabled ? 'true' : 'false',
        category: 'general',
        description: 'Enable maintenance mode'
      },
      update: {
        value: enabled ? 'true' : 'false'
      }
    })
    
    // Update .env.local file for middleware
    try {
      const envPath = join(process.cwd(), '.env.local')
      const envContent = `MAINTENANCE_MODE=${enabled ? 'true' : 'false'}\n`
      
      // Note: In production, you might want to use a different approach
      // such as updating environment variables through your deployment platform
      await writeFile(envPath, envContent, { flag: 'a' })
      
      console.log(`✅ Maintenance mode ${enabled ? 'enabled' : 'disabled'}`)
    } catch (envError) {
      console.error('Failed to update .env.local:', envError)
      // Continue anyway - the database setting is the source of truth for the UI
    }
    
    return NextResponse.json({
      success: true,
      enabled,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}. Restart the server for middleware to take effect.`
    })
    
  } catch (error) {
    console.error('Maintenance toggle error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle maintenance mode' },
      { status: 500 }
    )
  }
}

/**
 * Get maintenance mode status
 * GET /api/admin/maintenance
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const setting = await db.settings.findUnique({
      where: { key: 'general.maintenance_mode' }
    })
    
    return NextResponse.json({
      enabled: setting?.value === 'true',
      envEnabled: process.env.MAINTENANCE_MODE === 'true'
    })
    
  } catch (error) {
    console.error('Maintenance status error:', error)
    return NextResponse.json(
      { error: 'Failed to get maintenance status' },
      { status: 500 }
    )
  }
}