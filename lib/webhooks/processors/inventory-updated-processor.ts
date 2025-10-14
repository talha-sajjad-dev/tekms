import { BaseWebhookProcessor, ProcessingResult } from './base-processor'
import { db } from '@/lib/db'
import { Platform } from '@prisma/client'

/**
 * Inventory Updated Processor
 * Handles inventory update webhooks from BigCommerce and Shopify
 * Updates the InventoryLevel for the corresponding master product/variant
 */
export class InventoryUpdatedProcessor extends BaseWebhookProcessor {
  constructor(platform: Platform) {
    const eventType = platform === 'BIGCOMMERCE'
      ? 'store/product/inventory/updated'
      : 'inventory_levels/update'
    
    super(platform, eventType)
  }

  protected async process(payload: any, storeConnection: any): Promise<ProcessingResult> {
    const changes: ProcessingResult['changes'] = []

    try {
      let productId: string
      let variantId: string | null = null
      let newQuantity: number

      // Extract data based on platform
      if (this.platform === 'BIGCOMMERCE') {
        productId = payload.data?.product_id?.toString() || payload.producer
        variantId = payload.data?.variant_id?.toString() || null
        
        // Fetch current inventory from BigCommerce
        const inventoryData = await this.fetchBigCommerceInventory(
          storeConnection.externalStoreId,
          storeConnection.accessToken,
          productId,
          variantId
        )
        newQuantity = inventoryData.available || 0
        
      } else if (this.platform === 'SHOPIFY') {
        // Shopify sends inventory level updates
        const inventoryItemId = payload.inventory_item_id?.toString()
        newQuantity = payload.available || 0
        
        // We need to find the product/variant from inventory_item_id
        // This requires additional API calls or maintaining a mapping
        console.log('Shopify inventory update for item:', inventoryItemId)
        
        // For now, we'll store the event but not process it fully
        return {
          success: true,
          error: 'Shopify inventory processing requires additional implementation'
        }
        
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
          masterProduct: {
            include: {
              variants: true,
              inventoryLevels: true
            }
          }
        }
      })

      if (!channelListing?.masterProduct) {
        console.log(`No master product found for product ${productId}, skipping`)
        return {
          success: true,
          error: 'Product not managed by this system'
        }
      }

      const masterProduct = channelListing.masterProduct

      // Determine which inventory level to update
      let inventoryLevel: any
      let masterVariantId: string | null = null

      if (variantId && masterProduct.variants.length > 0) {
        // Find the master variant that corresponds to this channel variant
        const channelVariant = await db.channelVariant.findFirst({
          where: {
            channelListingId: channelListing.id,
            externalId: variantId
          },
          include: {
            masterVariant: {
              include: {
                inventoryLevel: true
              }
            }
          }
        })

        if (channelVariant?.masterVariant) {
          inventoryLevel = channelVariant.masterVariant.inventoryLevel
          masterVariantId = channelVariant.masterVariantId
        }
      } else {
        // Simple product (no variants)
        inventoryLevel = masterProduct.inventoryLevels[0]
      }

      if (!inventoryLevel) {
        // Create new inventory level
        const newInventoryLevel = await db.inventoryLevel.create({
          data: {
            userId: storeConnection.userId,
            masterProductId: masterVariantId ? undefined : masterProduct.id,
            masterVariantId: masterVariantId || undefined,
            totalQuantity: newQuantity,
            allocated: 0,
            available: newQuantity,
            trackInventory: true
          }
        })

        changes.push({
          entity: 'inventoryLevel',
          entityId: newInventoryLevel.id,
          field: 'totalQuantity',
          oldValue: 0,
          newValue: newQuantity
        })

        console.log(`Created inventory level for product ${productId}: ${newQuantity}`)
      } else {
        // Update existing inventory level
        const oldQuantity = inventoryLevel.totalQuantity
        
        if (oldQuantity !== newQuantity) {
          await db.inventoryLevel.update({
            where: { id: inventoryLevel.id },
            data: {
              totalQuantity: newQuantity,
              available: newQuantity - inventoryLevel.allocated
            }
          })

          changes.push({
            entity: 'inventoryLevel',
            entityId: inventoryLevel.id,
            field: 'totalQuantity',
            oldValue: oldQuantity,
            newValue: newQuantity
          })

          console.log(`Updated inventory for product ${productId}: ${oldQuantity} → ${newQuantity}`)
        }
      }

      return {
        success: true,
        changes
      }

    } catch (error) {
      console.error('Error processing inventory update:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch inventory data from BigCommerce
   */
  private async fetchBigCommerceInventory(
    storeHash: string,
    accessToken: string,
    productId: string,
    variantId: string | null
  ): Promise<any> {
    const { decrypt } = await import('@/lib/encryption')
    const decryptedToken = decrypt(accessToken)

    const url = variantId
      ? `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/variants/${variantId}`
      : `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}`

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': decryptedToken,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch BigCommerce inventory: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || data
  }
}