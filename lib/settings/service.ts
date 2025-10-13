/**
 * Settings Service
 * Centralized service for managing website settings
 */

import { db } from '@/lib/db'

export interface Setting {
  id: string
  key: string
  value: string
  type: string
  category: string
  description: string | null
  isPublic: boolean
  updatedAt: Date
  updatedBy: string | null
}

export interface SettingUpdate {
  key: string
  value: string
  type?: string
  category?: string
  description?: string
  isPublic?: boolean
  updatedBy?: string
}

/**
 * Get all settings, optionally filtered by category
 */
export async function getSettings(category?: string): Promise<Setting[]> {
  const where = category ? { category } : {}
  
  const settings = await db.settings.findMany({
    where,
    orderBy: [
      { category: 'asc' },
      { key: 'asc' }
    ]
  })
  
  return settings
}

/**
 * Get a single setting by key
 */
export async function getSetting(key: string): Promise<Setting | null> {
  return await db.settings.findUnique({
    where: { key }
  })
}

/**
 * Get setting value by key with default fallback
 */
export async function getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
  const setting = await getSetting(key)
  return setting?.value || defaultValue
}

/**
 * Get all public settings (for frontend use)
 */
export async function getPublicSettings(): Promise<Record<string, string>> {
  const settings = await db.settings.findMany({
    where: { isPublic: true }
  })
  
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)
}

/**
 * Update a single setting
 */
export async function updateSetting(
  key: string,
  value: string,
  updatedBy?: string
): Promise<Setting> {
  // Try to update existing setting
  const existing = await getSetting(key)
  
  if (existing) {
    return await db.settings.update({
      where: { key },
      data: {
        value,
        updatedBy,
        updatedAt: new Date()
      }
    })
  }
  
  // Create new setting if it doesn't exist
  return await db.settings.create({
    data: {
      key,
      value,
      type: 'string',
      category: 'general',
      updatedBy
    }
  })
}

/**
 * Bulk update settings
 */
export async function updateSettings(
  updates: SettingUpdate[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []
  
  for (const update of updates) {
    try {
      await updateSetting(update.key, update.value, update.updatedBy)
      success++
    } catch (error) {
      failed++
      errors.push(`Failed to update ${update.key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return { success, failed, errors }
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete({
    where: { key }
  })
}

/**
 * Get settings grouped by category
 */
export async function getSettingsByCategory(): Promise<Record<string, Setting[]>> {
  const settings = await getSettings()
  
  return settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)
}

/**
 * Get settings as a key-value object
 */
export async function getSettingsObject(category?: string): Promise<Record<string, string>> {
  const settings = await getSettings(category)
  
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)
}

/**
 * Seed default settings
 */
export async function seedDefaultSettings(): Promise<void> {
  const defaults: SettingUpdate[] = [
    // Branding
    { key: 'website.name', value: 'TEKMS Listing Manager', category: 'branding', description: 'Website name', isPublic: true },
    { key: 'website.header_title', value: 'Multi-Platform Product Manager', category: 'branding', description: 'Header title', isPublic: true },
    { key: 'website.tagline', value: 'Manage products across multiple platforms', category: 'branding', description: 'Site tagline', isPublic: true },
    { key: 'website.logo_url', value: '/placeholder-logo.svg', category: 'branding', description: 'Website logo URL', isPublic: true },
    { key: 'website.favicon_url', value: '/favicon.ico', category: 'branding', description: 'Favicon URL', isPublic: true },
    
    // Platform Icons (default to empty, admin can upload)
    { key: 'platform.bigcommerce_icon', value: '', category: 'platform_icons', description: 'BigCommerce icon SVG' },
    { key: 'platform.shopify_icon', value: '', category: 'platform_icons', description: 'Shopify icon SVG' },
    { key: 'platform.etsy_icon', value: '', category: 'platform_icons', description: 'Etsy icon SVG' },
    { key: 'platform.tiktok_icon', value: '', category: 'platform_icons', description: 'TikTok icon SVG' },
    
    // Footer
    { key: 'footer.copyright_text', value: `© ${new Date().getFullYear()} TEKMS Listing Manager. All rights reserved.`, category: 'footer', description: 'Footer copyright text', isPublic: true },
    { key: 'footer.show_social', value: 'true', category: 'footer', description: 'Show social media links', isPublic: true },
    { key: 'footer.social_twitter', value: '', category: 'footer', description: 'Twitter URL', isPublic: true },
    { key: 'footer.social_facebook', value: '', category: 'footer', description: 'Facebook URL', isPublic: true },
    { key: 'footer.social_linkedin', value: '', category: 'footer', description: 'LinkedIn URL', isPublic: true },
    { key: 'footer.social_instagram', value: '', category: 'footer', description: 'Instagram URL', isPublic: true },
    
    // SEO
    { key: 'seo.meta_description', value: 'Manage your products across multiple e-commerce platforms from one dashboard', category: 'seo', description: 'Site meta description', isPublic: true },
    { key: 'seo.meta_keywords', value: 'product management, e-commerce, multi-platform, BigCommerce, Shopify, Etsy, TikTok', category: 'seo', description: 'Site meta keywords', isPublic: true },
    
    // General
    { key: 'general.maintenance_mode', value: 'false', category: 'general', description: 'Maintenance mode enabled' },
    { key: 'general.google_analytics_id', value: '', category: 'general', description: 'Google Analytics tracking ID', isPublic: true },
  ]
  
  for (const setting of defaults) {
    const existing = await getSetting(setting.key)
    if (!existing) {
      await db.settings.create({
        data: {
          key: setting.key,
          value: setting.value,
          type: setting.type || 'string',
          category: setting.category || 'general',
          description: setting.description,
          isPublic: setting.isPublic || false
        }
      })
    }
  }
}