import { BaseWebhookProcessor, ProcessingResult } from './base-processor'
import { db } from '@/lib/db'
import { Platform } from '@prisma/client'

/**
 * Product Updated Processor
 * Handles product update webhooks from BigCommerce and Shopify
 * Updates the ChannelListing and optionally the MasterProduct
 */
export class ProductUpdatedProcessor extends BaseWebhookProcessor {
  constructor(platform: Platform) {
    const eventType = platform === 'BIGCOMMERCE' 
      ? 'store/product/updated'
      : 'products/update'
    
    super(platform, eventType)
  }

  protected async process(payload: any, storeConnection: any): Promise<ProcessingResult> {
    const changes: ProcessingResult['changes'] = []

    try {
      let productId: string
      let productData: any

      // Extract product ID and data based on platform
      if (this.platform === 'BIGCOMMERCE') {
        productId = payload.data?.id?.toString() || payload.producer
        
        // Fetch full product data from BigCommerce
        const response = await this.fetchBigCommerceProduct(
          storeConnection.externalStoreId,
          storeConnection.accessToken,
          productId
        )
        productData = response.data
      } else if (this.platform === 'SHOPIFY') {
        productId = payload.id?.toString() || payload.admin_graphql_api_id
        productData = payload
      } else {
        throw new Error(`Unsupported platform: ${this.platform}`)
      }

      // Find the channel listing
      const channelListing = await db.channelListing.findFirst({
        where: {
          externalId: productId,
          storeConnectionId: storeConnection.id,
          platform: this.platform
        },
        include: {
          masterProduct: true
        }
      })

      if (!channelListing) {
        console.log(`No channel listing found for product ${productId}, skipping`)
        return {
          success: true,
          error: 'Product not managed by this system'
        }
      }

      // Update channel listing with new data
      const updates: any = {}

      if (this.platform === 'BIGCOMMERCE') {
        if (productData.name && productData.name !== channelListing.titleOverride) {
          updates.titleOverride = productData.name
          changes.push({
            entity: 'channelListing',
            entityId: channelListing.id,
            field: 'titleOverride',
            oldValue: channelListing.titleOverride,
            newValue: productData.name
          })
        }

        if (productData.price && parseFloat(productData.price) !== parseFloat(channelListing.priceOverride?.toString() || '0')) {
          updates.priceOverride = parseFloat(productData.price)
          changes.push({
            entity: 'channelListing',
            entityId: channelListing.id,
            field: 'priceOverride',
            oldValue: channelListing.priceOverride?.toString(),
            newValue: productData.price
          })
        }

        if (productData.description) {
          updates.descriptionOverride = productData.description
        }
      } else if (this.platform === 'SHOPIFY') {
        if (productData.title && productData.title !== channelListing.titleOverride) {
          updates.titleOverride = productData.title
          changes.push({
            entity: 'channelListing',
            entityId: channelListing.id,
            field: 'titleOverride',
            oldValue: channelListing.titleOverride,
            newValue: productData.title
          })
        }

        // Shopify variants contain price info
        if (productData.variants && productData.variants.length > 0) {
          const firstVariantPrice = parseFloat(productData.variants[0].price)
          if (firstVariantPrice !== parseFloat(channelListing.priceOverride?.toString() || '0')) {
            updates.priceOverride = firstVariantPrice
            changes.push({
              entity: 'channelListing',
              entityId: channelListing.id,
              field: 'priceOverride',
              oldValue: channelListing.priceOverride?.toString(),
              newValue: firstVariantPrice
            })
          }
        }

        if (productData.body_html) {
          updates.descriptionOverride = productData.body_html
        }
      }

      // Update last pulled timestamp
      updates.lastPulledAt = new Date()

      // Apply updates to channel listing
      if (Object.keys(updates).length > 0) {
        await db.channelListing.update({
          where: { id: channelListing.id },
          data: updates
        })

        console.log(`Updated channel listing ${channelListing.id} for product ${productId}`)
      }

      // Optionally update master product (policy: only if no conflicts)
      // For now, we don't auto-update master products from channel changes
      // This prevents the "platform" from overwriting intentional master changes

      return {
        success: true,
        changes
      }

    } catch (error) {
      console.error('Error processing product update:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch full product data from BigCommerce
   */
  private async fetchBigCommerceProduct(
    storeHash: string,
    accessToken: string,
    productId: string
  ): Promise<any> {
    const { decrypt } = await import('@/lib/encryption')
    const decryptedToken = decrypt(accessToken)

    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}`,
      {
        headers: {
          'X-Auth-Token': decryptedToken,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch BigCommerce product: ${response.statusText}`)
    }

    return response.json()
  }
}