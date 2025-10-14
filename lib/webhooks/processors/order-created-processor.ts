import { BaseWebhookProcessor, ProcessingResult } from './base-processor'
import { db } from '@/lib/db'
import { Platform } from '@prisma/client'

/**
 * Order Created Processor
 * Handles new order webhooks from BigCommerce and Shopify
 * Reduces inventory levels when orders are placed
 */
export class OrderCreatedProcessor extends BaseWebhookProcessor {
  constructor(platform: Platform) {
    const eventType = platform === 'BIGCOMMERCE'
      ? 'store/order/created'
      : 'orders/create'
    
    super(platform, eventType)
  }

  protected async process(payload: any, storeConnection: any): Promise<ProcessingResult> {
    const changes: ProcessingResult['changes'] = []

    try {
      let orderId: string
      let orderItems: any[]

      // Extract order data based on platform
      if (this.platform === 'BIGCOMMERCE') {
        orderId = payload.data?.id?.toString() || payload.producer
        
        // Fetch full order data from BigCommerce
        const orderData = await this.fetchBigCommerceOrder(
          storeConnection.externalStoreId,
          storeConnection.accessToken,
          orderId
        )
        orderItems = orderData.products || []
        
      } else if (this.platform === 'SHOPIFY') {
        orderId = payload.id?.toString()
        orderItems = payload.line_items || []
        
      } else {
        throw new Error(`Unsupported platform: ${this.platform}`)
      }

      console.log(`Processing order ${orderId} with ${orderItems.length} items`)

      // Process each order item and reduce inventory
      for (const item of orderItems) {
        try {
          await this.processOrderItem(item, storeConnection, changes)
        } catch (error) {
          console.error(`Error processing order item:`, error)
          // Continue processing other items
        }
      }

      return {
        success: true,
        changes
      }

    } catch (error) {
      console.error('Error processing order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process a single order item and reduce inventory
   */
  private async processOrderItem(
    item: any,
    storeConnection: any,
    changes: ProcessingResult['changes']
  ): Promise<void> {
    let productId: string
    let variantId: string | null = null
    let quantity: number

    if (this.platform === 'BIGCOMMERCE') {
      productId = item.product_id?.toString()
      variantId = item.variant_id?.toString() || null
      quantity = item.quantity || 1
    } else if (this.platform === 'SHOPIFY') {
      productId = item.product_id?.toString()
      variantId = item.variant_id?.toString() || null
      quantity = item.quantity || 1
    } else {
      return
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
      console.log(`No master product found for product ${productId}, skipping inventory reduction`)
      return
    }

    const masterProduct = channelListing.masterProduct

    // Find the appropriate inventory level
    let inventoryLevel: any
    let masterVariantId: string | null = null

    if (variantId && masterProduct.variants.length > 0) {
      // Find the master variant
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

      if (channelVariant?.masterVariant?.inventoryLevel) {
        inventoryLevel = channelVariant.masterVariant.inventoryLevel
        masterVariantId = channelVariant.masterVariantId
      }
    } else {
      // Simple product
      inventoryLevel = masterProduct.inventoryLevels[0]
    }

    if (!inventoryLevel) {
      console.log(`No inventory level found for product ${productId}, skipping`)
      return
    }

    // Don't reduce if inventory tracking is disabled
    if (!inventoryLevel.trackInventory) {
      console.log(`Inventory tracking disabled for product ${productId}, skipping`)
      return
    }

    // Reduce inventory
    const oldQuantity = inventoryLevel.totalQuantity
    const newQuantity = Math.max(0, oldQuantity - quantity)
    const oldAllocated = inventoryLevel.allocated
    const newAllocated = oldAllocated + quantity

    await db.inventoryLevel.update({
      where: { id: inventoryLevel.id },
      data: {
        allocated: newAllocated,
        available: newQuantity - newAllocated
      }
    })

    changes!.push({
      entity: 'inventoryLevel',
      entityId: inventoryLevel.id,
      field: 'allocated',
      oldValue: oldAllocated,
      newValue: newAllocated
    })

    console.log(
      `Reduced inventory for product ${productId}: ${oldQuantity} → ${newQuantity} (allocated: ${newAllocated})`
    )
  }

  /**
   * Fetch full order data from BigCommerce
   */
  private async fetchBigCommerceOrder(
    storeHash: string,
    accessToken: string,
    orderId: string
  ): Promise<any> {
    const { decrypt } = await import('@/lib/encryption')
    const decryptedToken = decrypt(accessToken)

    // Fetch order
    const orderResponse = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`,
      {
        headers: {
          'X-Auth-Token': decryptedToken,
          'Accept': 'application/json'
        }
      }
    )

    if (!orderResponse.ok) {
      throw new Error(`Failed to fetch BigCommerce order: ${orderResponse.statusText}`)
    }

    const order = await orderResponse.json()

    // Fetch order products
    const productsResponse = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}/products`,
      {
        headers: {
          'X-Auth-Token': decryptedToken,
          'Accept': 'application/json'
        }
      }
    )

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch BigCommerce order products: ${productsResponse.statusText}`)
    }

    const products = await productsResponse.json()

    return {
      ...order,
      products
    }
  }
}