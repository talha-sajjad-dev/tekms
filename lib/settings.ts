import { db } from "@/lib/db"

export type SettingCategory = "general" | "stripe" | "email" | "integrations"

export interface Setting {
  key: string
  value: any
  type: "string" | "number" | "boolean" | "json"
  category: SettingCategory
  description?: string
  isPublic?: boolean
}

/**
 * Get a single setting value by key
 */
export async function getSetting(key: string): Promise<any> {
  const setting = await db.settings.findUnique({
    where: { key },
  })

  if (!setting) {
    return null
  }

  return parseSettingValue(setting.value, setting.type)
}

/**
 * Get multiple settings by category
 */
export async function getSettings(category?: SettingCategory): Promise<Record<string, any>> {
  const settings = await db.settings.findMany({
    where: category ? { category } : undefined,
  })

  return settings.reduce((acc, setting) => {
    acc[setting.key] = parseSettingValue(setting.value, setting.type)
    return acc
  }, {} as Record<string, any>)
}

/**
 * Set a setting value
 */
export async function setSetting(
  key: string,
  value: any,
  options?: {
    type?: "string" | "number" | "boolean" | "json"
    category?: SettingCategory
    description?: string
    isPublic?: boolean
    updatedBy?: string
  }
): Promise<void> {
  const stringValue = stringifySettingValue(value, options?.type || "string")

  await db.settings.upsert({
    where: { key },
    create: {
      key,
      value: stringValue,
      type: options?.type || "string",
      category: options?.category || "general",
      description: options?.description,
      isPublic: options?.isPublic || false,
      updatedBy: options?.updatedBy,
    },
    update: {
      value: stringValue,
      ...(options?.type && { type: options.type }),
      ...(options?.category && { category: options.category }),
      ...(options?.description && { description: options.description }),
      ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
      updatedBy: options?.updatedBy,
    },
  })
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete({
    where: { key },
  })
}

/**
 * Get all settings grouped by category
 */
export async function getAllSettings(): Promise<Record<string, Record<string, any>>> {
  const settings = await db.settings.findMany()

  return settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = {}
    }
    acc[setting.category][setting.key] = {
      value: parseSettingValue(setting.value, setting.type),
      type: setting.type,
      description: setting.description,
      isPublic: setting.isPublic,
      updatedAt: setting.updatedAt,
    }
    return acc
  }, {} as Record<string, Record<string, any>>)
}

/**
 * Initialize default settings
 */
export async function initializeDefaultSettings(): Promise<void> {
  const defaults: Setting[] = [
    // Stripe Settings
    {
      key: "stripe_publishable_key",
      value: "",
      type: "string",
      category: "stripe",
      description: "Stripe publishable key",
      isPublic: true,
    },
    {
      key: "stripe_secret_key",
      value: "",
      type: "string",
      category: "stripe",
      description: "Stripe secret key (sensitive)",
      isPublic: false,
    },
    {
      key: "stripe_webhook_secret",
      value: "",
      type: "string",
      category: "stripe",
      description: "Stripe webhook secret",
      isPublic: false,
    },
    {
      key: "stripe_enabled",
      value: false,
      type: "boolean",
      category: "stripe",
      description: "Enable Stripe payments",
      isPublic: false,
    },
    // Email Settings
    {
      key: "resend_api_key",
      value: "",
      type: "string",
      category: "email",
      description: "Resend API key",
      isPublic: false,
    },
    {
      key: "from_email",
      value: "noreply@tekmslisting.com",
      type: "string",
      category: "email",
      description: "From email address",
      isPublic: false,
    },
    {
      key: "from_name",
      value: "TEKMS Listing Manager",
      type: "string",
      category: "email",
      description: "From name",
      isPublic: false,
    },
    {
      key: "support_email",
      value: "support@tekmslisting.com",
      type: "string",
      category: "email",
      description: "Support email address",
      isPublic: true,
    },
    // General Settings
    {
      key: "app_name",
      value: "TEKMS Listing Manager",
      type: "string",
      category: "general",
      description: "Application name",
      isPublic: true,
    },
    {
      key: "app_url",
      value: "https://tekmslisting.com",
      type: "string",
      category: "general",
      description: "Application URL",
      isPublic: true,
    },
    {
      key: "maintenance_mode",
      value: false,
      type: "boolean",
      category: "general",
      description: "Enable maintenance mode",
      isPublic: false,
    },
    // Integrations
    {
      key: "meilisearch_host",
      value: "http://localhost:7700",
      type: "string",
      category: "integrations",
      description: "Meilisearch host URL",
      isPublic: false,
    },
    {
      key: "meilisearch_master_key",
      value: "",
      type: "string",
      category: "integrations",
      description: "Meilisearch master key",
      isPublic: false,
    },
  ]

  for (const setting of defaults) {
    const existing = await db.settings.findUnique({
      where: { key: setting.key },
    })

    if (!existing) {
      await setSetting(setting.key, setting.value, {
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isPublic: setting.isPublic,
      })
    }
  }
}

// Helper functions

function parseSettingValue(value: string, type: string): any {
  switch (type) {
    case "number":
      return parseFloat(value)
    case "boolean":
      return value === "true"
    case "json":
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    default:
      return value
  }
}

function stringifySettingValue(value: any, type: string): string {
  switch (type) {
    case "json":
      return JSON.stringify(value)
    case "boolean":
      return value ? "true" : "false"
    default:
      return String(value)
  }
}