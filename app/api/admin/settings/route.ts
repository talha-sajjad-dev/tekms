import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
  getSettingsByCategory,
  getSettingsObject
} from '@/lib/settings/service'

/**
 * GET /api/admin/settings
 * Get all settings or filtered by category
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const key = searchParams.get('key')
    const grouped = searchParams.get('grouped') === 'true'
    const asObject = searchParams.get('asObject') === 'true'
    
    // Get single setting by key
    if (key) {
      const setting = await getSetting(key)
      if (!setting) {
        return NextResponse.json(
          { error: 'Setting not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ setting })
    }
    
    // Get settings as object
    if (asObject) {
      const settings = await getSettingsObject(category || undefined)
      return NextResponse.json({ settings })
    }
    
    // Get settings grouped by category
    if (grouped) {
      const settings = await getSettingsByCategory()
      return NextResponse.json({ settings })
    }
    
    // Get all settings or filtered by category
    const settings = await getSettings(category || undefined)
    return NextResponse.json({ settings })
    
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings
 * Update multiple settings at once
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    const { settings } = await req.json()
    
    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Invalid request - settings array required' },
        { status: 400 }
      )
    }
    
    // Add updatedBy to each setting
    const settingsWithUser = settings.map(s => ({
      ...s,
      updatedBy: session.user.id
    }))
    
    const result = await updateSettings(settingsWithUser)
    
    // Log maintenance mode changes
    const maintenanceSetting = settings.find(s => s.key === 'general.maintenance_mode')
    if (maintenanceSetting) {
      console.log(`✅ Maintenance mode ${maintenanceSetting.value === 'true' ? 'enabled' : 'disabled'}`)
    }
    
    if (result.failed > 0) {
      return NextResponse.json({
        message: `Updated ${result.success} settings, ${result.failed} failed`,
        success: false,
        successCount: result.success,
        failedCount: result.failed,
        errors: result.errors
      }, { status: 207 }) // Multi-Status
    }
    
    return NextResponse.json({
      message: `Successfully updated ${result.success} settings`,
      success: true,
      successCount: result.success,
      failedCount: result.failed
    })
    
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings
 * Update a single setting
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    const { key, value } = await req.json()
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Invalid request - key and value required' },
        { status: 400 }
      )
    }
    
    const setting = await updateSetting(key, value, session.user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    })
    
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}