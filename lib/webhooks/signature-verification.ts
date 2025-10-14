import crypto from 'crypto'

/**
 * Webhook Signature Verification
 * Verifies webhook signatures from BigCommerce, Shopify, and other platforms
 */

/**
 * Verify BigCommerce webhook signature
 * BigCommerce uses HMAC SHA256 with the client secret
 */
export function verifyBigCommerceSignature(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', clientSecret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('base64')
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying BigCommerce signature:', error)
    return false
  }
}

/**
 * Verify Shopify webhook signature
 * Shopify uses HMAC SHA256 with the shared secret
 */
export function verifyShopifySignature(
  payload: string,
  signature: string,
  sharedSecret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', sharedSecret)
    hmac.update(payload, 'utf8')
    const expectedSignature = hmac.digest('base64')
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying Shopify signature:', error)
    return false
  }
}

/**
 * Extract BigCommerce webhook signature from headers
 */
export function extractBigCommerceSignature(headers: Headers): string | null {
  // BigCommerce sends signature in X-BC-Webhook-Signature header
  return headers.get('x-bc-webhook-signature') || headers.get('X-BC-Webhook-Signature')
}

/**
 * Extract Shopify webhook signature from headers
 */
export function extractShopifySignature(headers: Headers): string | null {
  // Shopify sends signature in X-Shopify-Hmac-SHA256 header
  return headers.get('x-shopify-hmac-sha256') || headers.get('X-Shopify-Hmac-SHA256')
}

/**
 * Extract Shopify topic from headers
 */
export function extractShopifyTopic(headers: Headers): string | null {
  // Shopify sends the topic in X-Shopify-Topic header
  return headers.get('x-shopify-topic') || headers.get('X-Shopify-Topic')
}

/**
 * Extract Shopify shop domain from headers
 */
export function extractShopifyDomain(headers: Headers): string | null {
  // Shopify sends the shop domain in X-Shopify-Shop-Domain header
  return headers.get('x-shopify-shop-domain') || headers.get('X-Shopify-Shop-Domain')
}

/**
 * Generic webhook signature verification
 * Determines platform and verifies accordingly
 */
export function verifyWebhookSignature(
  platform: 'BIGCOMMERCE' | 'SHOPIFY' | 'ETSY',
  payload: string,
  signature: string,
  secret: string
): boolean {
  switch (platform) {
    case 'BIGCOMMERCE':
      return verifyBigCommerceSignature(payload, signature, secret)
    
    case 'SHOPIFY':
      return verifyShopifySignature(payload, signature, secret)
    
    case 'ETSY':
      // Etsy verification to be implemented when needed
      console.warn('Etsy webhook verification not yet implemented')
      return true
    
    default:
      console.error(`Unsupported platform for webhook verification: ${platform}`)
      return false
  }
}

/**
 * Get webhook secret for a platform
 * Secrets should be stored in environment variables
 */
export function getWebhookSecret(platform: 'BIGCOMMERCE' | 'SHOPIFY' | 'ETSY'): string {
  switch (platform) {
    case 'BIGCOMMERCE':
      return process.env.BIGCOMMERCE_CLIENT_SECRET || ''
    
    case 'SHOPIFY':
      return process.env.SHOPIFY_WEBHOOK_SECRET || ''
    
    case 'ETSY':
      return process.env.ETSY_WEBHOOK_SECRET || ''
    
    default:
      throw new Error(`No webhook secret configured for platform: ${platform}`)
  }
}

/**
 * Verify webhook request
 * Complete verification including signature and timing
 */
export interface WebhookVerificationResult {
  valid: boolean
  error?: string
  platform?: 'BIGCOMMERCE' | 'SHOPIFY' | 'ETSY'
}

export async function verifyWebhookRequest(
  headers: Headers,
  body: string,
  expectedPlatform?: 'BIGCOMMERCE' | 'SHOPIFY' | 'ETSY'
): Promise<WebhookVerificationResult> {
  try {
    // Determine platform from headers or use expected platform
    let platform = expectedPlatform
    let signature: string | null = null

    if (!platform) {
      // Try to determine platform from headers
      if (headers.get('x-bc-webhook-signature')) {
        platform = 'BIGCOMMERCE'
      } else if (headers.get('x-shopify-hmac-sha256')) {
        platform = 'SHOPIFY'
      } else {
        return {
          valid: false,
          error: 'Could not determine webhook platform'
        }
      }
    }

    // Extract signature based on platform
    if (platform === 'BIGCOMMERCE') {
      signature = extractBigCommerceSignature(headers)
    } else if (platform === 'SHOPIFY') {
      signature = extractShopifySignature(headers)
    }

    if (!signature) {
      return {
        valid: false,
        error: `No signature found in headers for ${platform}`,
        platform
      }
    }

    // Get webhook secret
    const secret = getWebhookSecret(platform)
    if (!secret) {
      return {
        valid: false,
        error: `No webhook secret configured for ${platform}`,
        platform
      }
    }

    // Verify signature
    const valid = verifyWebhookSignature(platform, body, signature, secret)

    if (!valid) {
      return {
        valid: false,
        error: 'Invalid webhook signature',
        platform
      }
    }

    return {
      valid: true,
      platform
    }
  } catch (error) {
    console.error('Error verifying webhook request:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}