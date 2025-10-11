import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { getAllSettings, setSetting, bulkUpdateSettings } from '@/lib/settings'

export async function GET() {
  try {
    const user = await requireAdmin()
    
    // Get all settings with values (admin only)
    const allSettings = await getAllSettings(true)
    
    // Initialize empty settings for missing categories
    const defaultSettings = [
      // Stripe
      { key: 'stripe_secret_key', value: '', category: 'stripe', type: 'string', isPublic: false, description: 'Stripe API Secret Key' },
      { key: 'stripe_publishable_key', value: '', category: 'stripe', type: 'string', isPublic: false, description: 'Stripe Publishable Key' },
      { key: 'stripe_webhook_secret', value: '', category: 'stripe', type: 'string', isPublic: false, description: 'Stripe Webhook Secret' },
      
      // Email
      { key: 'email_provider', value: 'resend', category: 'email', type: 'string', isPublic: false, description: 'Email service provider' },
      { key: 'email_api_key', value: '', category: 'email', type: 'string', isPublic: false, description: 'Email provider API key' },
      { key: 'email_from_address', value: 'noreply@tekms.com', category: 'email', type: 'string', isPublic: false, description: 'Default from email address' },
      { key: 'email_from_name', value: 'TEKMS Listing Manager', category: 'email', type: 'string', isPublic: false, description: 'Default from name' },
      
      // AI
      { key: 'ai_provider', value: 'openai', category: 'ai', type: 'string', isPublic: false, description: 'AI service provider' },
      { key: 'ai_api_key', value: '', category: 'ai', type: 'string', isPublic: false, description: 'AI API key' },
      { key: 'ai_model', value: 'gpt-4', category: 'ai', type: 'string', isPublic: false, description: 'AI model to use' },
      
      // OAuth - Shopify
      { key: 'shopify_client_id', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Shopify OAuth Client ID' },
      { key: 'shopify_client_secret', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Shopify OAuth Client Secret' },
      { key: 'shopify_redirect_uri', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Shopify OAuth Redirect URI' },
      
      // OAuth - Etsy
      { key: 'etsy_client_id', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Etsy OAuth Client ID' },
      { key: 'etsy_client_secret', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Etsy OAuth Client Secret' },
      { key: 'etsy_redirect_uri', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'Etsy OAuth Redirect URI' },
      
      // OAuth - BigCommerce
      { key: 'bigcommerce_client_id', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'BigCommerce OAuth Client ID' },
      { key: 'bigcommerce_client_secret', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'BigCommerce OAuth Client Secret' },
      { key: 'bigcommerce_redirect_uri', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'BigCommerce OAuth Redirect URI' },
      
      // OAuth - TikTok
      { key: 'tiktok_client_id', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'TikTok OAuth Client ID' },
      { key: 'tiktok_client_secret', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'TikTok OAuth Client Secret' },
      { key: 'tiktok_redirect_uri', value: '', category: 'oauth', type: 'string', isPublic: false, description: 'TikTok OAuth Redirect URI' },
      
      // App
      { key: 'app_name', value: 'TEKMS Listing Manager', category: 'app', type: 'string', isPublic: true, description: 'Application name' },
      { key: 'app_url', value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', category: 'app', type: 'string', isPublic: true, description: 'Application URL' },
      { key: 'support_email', value: 'support@tekms.com', category: 'app', type: 'string', isPublic: true, description: 'Support email address' },
      { key: 'maintenance_mode', value: 'false', category: 'app', type: 'boolean', isPublic: false, description: 'Enable maintenance mode' },
    ]
    
    // Merge with existing settings
    const existingKeys = new Set(allSettings.map(s => s.key))
    const mergedSettings = [
      ...allSettings,
      ...defaultSettings.filter(d => !existingKeys.has(d.key))
    ]
    
    return NextResponse.json({ settings: mergedSettings })
  } catch (error: any) {
    console.error('Admin settings GET error:', error)
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin()
    const { settings } = await req.json()
    
    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      )
    }
    
    // Update each setting
    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        continue
      }
      
      await setSetting(setting.key, setting.value, {
        category: setting.category,
        description: setting.description,
        type: setting.type || 'string',
        isPublic: setting.isPublic || false,
        updatedBy: user.id
      })
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Updated ${settings.length} settings`
    })
  } catch (error: any) {
    console.error('Admin settings POST error:', error)
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}