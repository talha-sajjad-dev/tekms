import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { Platform } from '@prisma/client'

/**
 * Webhook Manager
 * Handles webhook registration, deregistration, and signature verification
 * for BigCommerce, Shopify, and Etsy platforms
 */

export interface WebhookRegistration {
  id: string
  scope: string
  destination: string
  isActive: boolean
}

export interface RegisterWebhookParams {
  storeConnectionId: string
  scope: string
  destination: string
}

/**
 * Register webhooks for a store connection
 */
export async function registerWebhooksForStore(storeConnectionId: string, baseUrl: string): Promise<{
  success: boolean
  registeredWebhooks: WebhookRegistration[]
  errors?: string[]
}> {
  const storeConnection = await db.storeConnection.findUnique({
    where: { id: storeConnectionId },
    include: { user: true }
  })

  if (!storeConnection) {
    throw new Error('Store connection not found')
  }

  const accessToken = decrypt(storeConnection.accessToken)
  const platform = storeConnection.platform

  let registeredWebhooks: WebhookRegistration[] = []
  let errors: string[] = []

  try {
    switch (platform) {
      case 'BIGCOMMERCE':
        registeredWebhooks = await registerBigCommerceWebhooks(
          storeConnection.externalStoreId,
          accessToken,
          baseUrl,
          storeConnectionId
        )
        break

      case 'SHOPIFY':
        registeredWebhooks = await registerShopifyWebhooks(
          storeConnection.storeUrl || '',
          accessToken,
          baseUrl,
          storeConnectionId
        )
        break

      case 'ETSY':
        // Etsy doesn't support webhooks in the same way, placeholder for future
        errors.push('Etsy webhook registration not yet implemented')
        break

      default:
        errors.push(`Unsupported platform: ${platform}`)
    }

    // Store webhook IDs in metadata
    if (registeredWebhooks.length > 0) {
      await db.storeConnection.update({
        where: { id: storeConnectionId },
        data: {
          metadata: {
            ...(storeConnection.metadata as any || {}),
            webhooks: registeredWebhooks
          }
        }
      })
    }

    return {
      success: errors.length === 0,
      registeredWebhooks,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Error registering webhooks:', error)
    throw error
  }
}

/**
 * Register BigCommerce webhooks
 */
async function registerBigCommerceWebhooks(
  storeHash: string,
  accessToken: string,
  baseUrl: string,
  storeConnectionId: string
): Promise<WebhookRegistration[]> {
  const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`
  const headers = {
    'X-Auth-Token': accessToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  // Define webhooks to register
  const webhooksToRegister = [
    {
      scope: 'store/product/updated',
      destination: `${baseUrl}/api/webhooks/bigcommerce?storeId=${storeConnectionId}`
    },
    {
      scope: 'store/product/deleted',
      destination: `${baseUrl}/api/webhooks/bigcommerce?storeId=${storeConnectionId}`
    },
    {
      scope: 'store/product/inventory/updated',
      destination: `${baseUrl}/api/webhooks/bigcommerce?storeId=${storeConnectionId}`
    },
    {
      scope: 'store/order/created',
      destination: `${baseUrl}/api/webhooks/bigcommerce?storeId=${storeConnectionId}`
    }
  ]

  const registered: WebhookRegistration[] = []

  // First, get existing webhooks to avoid duplicates
  const existingResponse = await fetch(apiUrl, {
    headers,
    method: 'GET'
  })

  let existingWebhooks: any[] = []
  if (existingResponse.ok) {
    const data = await existingResponse.json()
    existingWebhooks = data.data || []
  }

  for (const webhook of webhooksToRegister) {
    // Check if webhook already exists
    const exists = existingWebhooks.find(
      (w: any) => w.scope === webhook.scope && w.destination === webhook.destination
    )

    if (exists) {
      registered.push({
        id: exists.id.toString(),
        scope: exists.scope,
        destination: exists.destination,
        isActive: exists.is_active
      })
      continue
    }

    // Register new webhook
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhook)
      })

      if (response.ok) {
        const data = await response.json()
        registered.push({
          id: data.data.id.toString(),
          scope: data.data.scope,
          destination: data.data.destination,
          isActive: data.data.is_active
        })
      } else {
        console.error(`Failed to register webhook ${webhook.scope}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error registering webhook ${webhook.scope}:`, error)
    }
  }

  return registered
}

/**
 * Register Shopify webhooks
 */
async function registerShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
  baseUrl: string,
  storeConnectionId: string
): Promise<WebhookRegistration[]> {
  const apiUrl = `https://${shopDomain}/admin/api/2024-01/webhooks.json`
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  // Define webhooks to register
  const webhooksToRegister = [
    {
      topic: 'products/update',
      address: `${baseUrl}/api/webhooks/shopify?storeId=${storeConnectionId}`,
      format: 'json'
    },
    {
      topic: 'products/delete',
      address: `${baseUrl}/api/webhooks/shopify?storeId=${storeConnectionId}`,
      format: 'json'
    },
    {
      topic: 'inventory_levels/update',
      address: `${baseUrl}/api/webhooks/shopify?storeId=${storeConnectionId}`,
      format: 'json'
    },
    {
      topic: 'orders/create',
      address: `${baseUrl}/api/webhooks/shopify?storeId=${storeConnectionId}`,
      format: 'json'
    }
  ]

  const registered: WebhookRegistration[] = []

  // First, get existing webhooks
  const existingResponse = await fetch(apiUrl, {
    headers,
    method: 'GET'
  })

  let existingWebhooks: any[] = []
  if (existingResponse.ok) {
    const data = await existingResponse.json()
    existingWebhooks = data.webhooks || []
  }

  for (const webhook of webhooksToRegister) {
    // Check if webhook already exists
    const exists = existingWebhooks.find(
      (w: any) => w.topic === webhook.topic && w.address === webhook.address
    )

    if (exists) {
      registered.push({
        id: exists.id.toString(),
        scope: exists.topic,
        destination: exists.address,
        isActive: true
      })
      continue
    }

    // Register new webhook
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ webhook })
      })

      if (response.ok) {
        const data = await response.json()
        registered.push({
          id: data.webhook.id.toString(),
          scope: data.webhook.topic,
          destination: data.webhook.address,
          isActive: true
        })
      } else {
        console.error(`Failed to register webhook ${webhook.topic}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error registering webhook ${webhook.topic}:`, error)
    }
  }

  return registered
}

/**
 * Deregister all webhooks for a store
 */
export async function deregisterWebhooksForStore(storeConnectionId: string): Promise<{
  success: boolean
  errors?: string[]
}> {
  const storeConnection = await db.storeConnection.findUnique({
    where: { id: storeConnectionId }
  })

  if (!storeConnection) {
    throw new Error('Store connection not found')
  }

  const metadata = storeConnection.metadata as any
  const webhooks = metadata?.webhooks as WebhookRegistration[] || []

  if (webhooks.length === 0) {
    return { success: true }
  }

  const accessToken = decrypt(storeConnection.accessToken)
  const platform = storeConnection.platform
  const errors: string[] = []

  try {
    switch (platform) {
      case 'BIGCOMMERCE':
        await deregisterBigCommerceWebhooks(
          storeConnection.externalStoreId,
          accessToken,
          webhooks
        )
        break

      case 'SHOPIFY':
        await deregisterShopifyWebhooks(
          storeConnection.storeUrl || '',
          accessToken,
          webhooks
        )
        break

      case 'ETSY':
        // Placeholder for Etsy
        break
    }

    // Clear webhook metadata
    await db.storeConnection.update({
      where: { id: storeConnectionId },
      data: {
        metadata: {
          ...(metadata || {}),
          webhooks: []
        }
      }
    })

    return { success: true, errors: errors.length > 0 ? errors : undefined }
  } catch (error) {
    console.error('Error deregistering webhooks:', error)
    throw error
  }
}

/**
 * Deregister BigCommerce webhooks
 */
async function deregisterBigCommerceWebhooks(
  storeHash: string,
  accessToken: string,
  webhooks: WebhookRegistration[]
): Promise<void> {
  const headers = {
    'X-Auth-Token': accessToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  for (const webhook of webhooks) {
    try {
      const response = await fetch(
        `https://api.bigcommerce.com/stores/${storeHash}/v3/hooks/${webhook.id}`,
        {
          method: 'DELETE',
          headers
        }
      )

      if (!response.ok) {
        console.error(`Failed to delete webhook ${webhook.id}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error deleting webhook ${webhook.id}:`, error)
    }
  }
}

/**
 * Deregister Shopify webhooks
 */
async function deregisterShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
  webhooks: WebhookRegistration[]
): Promise<void> {
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  for (const webhook of webhooks) {
    try {
      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
        {
          method: 'DELETE',
          headers
        }
      )

      if (!response.ok) {
        console.error(`Failed to delete webhook ${webhook.id}:`, await response.text())
      }
    } catch (error) {
      console.error(`Error deleting webhook ${webhook.id}:`, error)
    }
  }
}

/**
 * Get webhook status for a store
 */
export async function getWebhookStatus(storeConnectionId: string): Promise<{
  registered: boolean
  webhooks: WebhookRegistration[]
}> {
  const storeConnection = await db.storeConnection.findUnique({
    where: { id: storeConnectionId }
  })

  if (!storeConnection) {
    throw new Error('Store connection not found')
  }

  const metadata = storeConnection.metadata as any
  const webhooks = metadata?.webhooks as WebhookRegistration[] || []

  return {
    registered: webhooks.length > 0,
    webhooks
  }
}