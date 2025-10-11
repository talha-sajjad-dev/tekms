import { db } from './db'
import { decrypt, encrypt } from './encryption'

/**
 * Get a setting value from database
 * Automatically decrypts sensitive values
 */
export async function getSetting(
  key: string,
  defaultValue?: string
): Promise<string | null> {
  const setting = await db.settings.findUnique({
    where: { key }
  })
  
  if (!setting) {
    return defaultValue || null
  }
  
  // Decrypt if it's a sensitive setting (contains 'key', 'secret', 'token', 'password')
  const isSensitive = /key|secret|token|password|api/i.test(key)
  
  if (isSensitive && setting.value) {
    try {
      return decrypt(setting.value)
    } catch (err) {
      console.error(`Failed to decrypt setting: ${key}`, err)
      return setting.value // Return as-is if decryption fails
    }
  }
  
  return setting.value
}

/**
 * Get multiple settings by category
 */
export async function getSettingsByCategory(category: string) {
  const settings = await db.settings.findMany({
    where: { category },
    orderBy: { key: 'asc' }
  })
  
  const result: Record<string, string> = {}
  
  for (const setting of settings) {
    const isSensitive = /key|secret|token|password|api/i.test(setting.key)
    if (isSensitive && setting.value) {
      try {
        result[setting.key] = decrypt(setting.value)
      } catch (err) {
        result[setting.key] = setting.value
      }
    } else {
      result[setting.key] = setting.value
    }
  }
  
  return result
}

/**
 * Set a setting value in database
 * Automatically encrypts sensitive values
 */
export async function setSetting(
  key: string,
  value: string,
  options?: {
    category?: string
    description?: string
    type?: string
    isPublic?: boolean
    updatedBy?: string
  }
): Promise<void> {
  const isSensitive = /key|secret|token|password|api/i.test(key)
  const finalValue = isSensitive ? encrypt(value) : value
  
  await db.settings.upsert({
    where: { key },
    update: {
      value: finalValue,
      updatedBy: options?.updatedBy,
      ...(options?.description && { description: options.description }),
      ...(options?.type && { type: options.type }),
      ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
    },
    create: {
      key,
      value: finalValue,
      category: options?.category || 'general',
      description: options?.description,
      type: options?.type || 'string',
      isPublic: options?.isPublic || false,
      updatedBy: options?.updatedBy,
    }
  })
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
 * Get all settings (admin only)
 */
export async function getAllSettings(includeValues = false) {
  const settings = await db.settings.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }]
  })
  
  if (!includeValues) {
    return settings.map(s => ({
      ...s,
      value: s.isPublic ? s.value : '***HIDDEN***'
    }))
  }
  
  // Decrypt sensitive values
  return settings.map(s => {
    const isSensitive = /key|secret|token|password|api/i.test(s.key)
    if (isSensitive && s.value) {
      try {
        return { ...s, value: decrypt(s.value) }
      } catch (err) {
        return s
      }
    }
    return s
  })
}

/**
 * Bulk update settings
 */
export async function bulkUpdateSettings(
  updates: Array<{ key: string; value: string }>,
  updatedBy?: string
): Promise<void> {
  for (const { key, value } of updates) {
    await setSetting(key, value, { updatedBy })
  }
}

// ============================================
// SPECIFIC SETTING GETTERS
// ============================================

export async function getStripeKeys() {
  const [secretKey, publishableKey, webhookSecret] = await Promise.all([
    getSetting('stripe_secret_key', process.env.STRIPE_SECRET_KEY),
    getSetting('stripe_publishable_key', process.env.STRIPE_PUBLISHABLE_KEY),
    getSetting('stripe_webhook_secret', process.env.STRIPE_WEBHOOK_SECRET),
  ])
  
  return {
    secretKey,
    publishableKey,
    webhookSecret
  }
}

export async function getEmailConfig() {
  const [
    provider,
    apiKey,
    fromEmail,
    fromName,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword
  ] = await Promise.all([
    getSetting('email_provider', process.env.EMAIL_PROVIDER || 'smtp'),
    getSetting('email_api_key', process.env.RESEND_API_KEY),
    getSetting('email_from_address', process.env.EMAIL_FROM || 'noreply@tekms.com'),
    getSetting('email_from_name', 'TEKMS Listing Manager'),
    getSetting('email_smtp_host', process.env.SMTP_HOST || 'smtp.zoho.com'),
    getSetting('email_smtp_port', process.env.SMTP_PORT || '465'),
    getSetting('email_smtp_user', process.env.SMTP_USER),
    getSetting('email_smtp_password', process.env.SMTP_PASSWORD),
  ])
  
  return {
    provider,
    apiKey,
    fromEmail,
    fromName,
    smtp_host: smtpHost,
    smtp_port: parseInt(smtpPort || '465'),
    smtp_user: smtpUser,
    smtp_password: smtpPassword,
  }
}

export async function getAIConfig() {
  const [provider, apiKey, model] = await Promise.all([
    getSetting('ai_provider', 'openai'),
    getSetting('ai_api_key', process.env.OPENAI_API_KEY),
    getSetting('ai_model', 'gpt-4'),
  ])
  
  return {
    provider,
    apiKey,
    model
  }
}

export async function getOAuthConfig(platform: 'shopify' | 'etsy' | 'bigcommerce' | 'tiktok') {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getSetting(`${platform}_client_id`, process.env[`${platform.toUpperCase()}_CLIENT_ID`]),
    getSetting(`${platform}_client_secret`, process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]),
    getSetting(`${platform}_redirect_uri`, process.env[`${platform.toUpperCase()}_REDIRECT_URI`]),
  ])
  
  return {
    clientId,
    clientSecret,
    redirectUri
  }
}

export async function getAppConfig() {
  const [appName, appUrl, supportEmail, maintenanceMode] = await Promise.all([
    getSetting('app_name', 'TEKMS Listing Manager'),
    getSetting('app_url', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    getSetting('support_email', 'support@tekms.com'),
    getSetting('maintenance_mode', 'false'),
  ])
  
  return {
    appName,
    appUrl,
    supportEmail,
    maintenanceMode: maintenanceMode === 'true'
  }
}