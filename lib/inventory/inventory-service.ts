/**
 * Inventory Service - Manage inventory levels and sync across platforms
 * Handles allocation, tracking, low stock detection, and multi-channel sync
 */

import { db } from '@/lib/db'
import { Platform } from '@prisma/client'
import { decrypt } from '@/lib/encryption'

export interface InventoryAllocation {
  storeId: string
  storeName: string
  platform: Platform
  allocated: number
}

export interface InventoryStatus {
  inventoryLevel: {
    id: string
    totalQuantity: number
    allocated: number
    available: number
    lowStockThreshold: number
    safetyStock: number
    trackInventory: boolean
    allowBackorder: boolean
  }
  allocations: InventoryAllocation[]
  isLowStock: boolean
  needsRestock: boolean
}

export interface SyncResult {
  success: boolean
  platform: Platform
  storeId: string
  storeName: string
  externalId?: string
  quantitySynced?: number
  error?: string
}

export class InventoryService {
  /**
   * Get inventory status for a master product or variant
   */
  static async getInventoryStatus(
    masterProductId?: string,
    masterVariantId?: string,
    userId?: string
  ): Promise<InventoryStatus | null> {
    const where: any = {}
    
    if (masterProductId) {
      where.masterProductId = masterProductId
    } else if (masterVariantId) {
      where.masterVariantId = masterVariantId
    } else {
      return null
    }

    if (userId) {
      where.userId = userId
    }

    const inventoryLevel = await db.inventoryLevel.findFirst({
      where,
      include: {
        masterProduct: {
          include: {
            channelListings: {
              include: {
                storeConnection: true
              }
            }
          }
        },
        masterVariant: {
          include: {
            masterProduct: {
              include: {
                channelListings: {
                  include: {
                    storeConnection: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!inventoryLevel) return null

    // Get channel allocations
    const channelAllocations = (inventoryLevel.channelAllocations as Record<string, number>) || {}
    const allocations: InventoryAllocation[] = []

    // Get store connections for allocations
    const masterProduct = inventoryLevel.masterProduct || inventoryLevel.masterVariant?.masterProduct
    if (masterProduct?.channelListings) {
      for (const listing of masterProduct.channelListings) {
        const allocated = channelAllocations[listing.storeConnectionId] || 0
        allocations.push({
          storeId: listing.storeConnectionId,
          storeName: listing.storeConnection.storeName,
          platform: listing.platform,
          allocated
        })
      }
    }

    const isLowStock = inventoryLevel.available <= inventoryLevel.lowStockThreshold
    const needsRestock = inventoryLevel.available <= inventoryLevel.safetyStock

    return {
      inventoryLevel: {
        id: inventoryLevel.id,
        totalQuantity: inventoryLevel.totalQuantity,
        allocated: inventoryLevel.allocated,
        available: inventoryLevel.available,
        lowStockThreshold: inventoryLevel.lowStockThreshold,
        safetyStock: inventoryLevel.safetyStock,
        trackInventory: inventoryLevel.trackInventory,
        allowBackorder: inventoryLevel.allowBackorder
      },
      allocations,
      isLowStock,
      needsRestock
    }
  }

  /**
   * Calculate available inventory (total - allocated)
   */
  static calculateAvailable(totalQuantity: number, allocated: number): number {
    return Math.max(0, totalQuantity - allocated)
  }

  /**
   * Adjust inventory level (add or remove stock)
   */
  static async adjustInventory(
    inventoryLevelId: string,
    adjustment: number,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; newTotal: number; newAvailable: number; error?: string }> {
    try {
      const inventoryLevel = await db.inventoryLevel.findFirst({
        where: {
          id: inventoryLevelId,
          userId
        }
      })

      if (!inventoryLevel) {
        return { success: false, newTotal: 0, newAvailable: 0, error: 'Inventory level not found' }
      }

      const newTotal = inventoryLevel.totalQuantity + adjustment
      
      if (newTotal < 0) {
        return { 
          success: false, 
          newTotal: inventoryLevel.totalQuantity, 
          newAvailable: inventoryLevel.available,
          error: 'Cannot reduce inventory below zero' 
        }
      }

      const newAvailable = this.calculateAvailable(newTotal, inventoryLevel.allocated)

      const updated = await db.inventoryLevel.update({
        where: { id: inventoryLevelId },
        data: {
          totalQuantity: newTotal,
          available: newAvailable
        }
      })

      // Log the change
      await db.changeLog.create({
        data: {
          userId,
          entityType: 'inventory',
          entityId: inventoryLevelId,
          field: 'totalQuantity',
          oldValue: inventoryLevel.totalQuantity,
          newValue: newTotal,
          source: 'user',
          sourceId: reason || 'manual_adjustment'
        }
      }).catch(console.error)

      return {
        success: true,
        newTotal: updated.totalQuantity,
        newAvailable: updated.available
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      return {
        success: false,
        newTotal: 0,
        newAvailable: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Allocate inventory to a specific channel
   */
  static async allocateToChannel(
    inventoryLevelId: string,
    storeConnectionId: string,
    quantity: number,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const inventoryLevel = await db.inventoryLevel.findFirst({
        where: {
          id: inventoryLevelId,
          userId
        }
      })

      if (!inventoryLevel) {
        return { success: false, error: 'Inventory level not found' }
      }

      const channelAllocations = (inventoryLevel.channelAllocations as Record<string, number>) || {}
      const currentAllocation = channelAllocations[storeConnectionId] || 0
      const allocationDiff = quantity - currentAllocation

      // Check if we have enough available inventory
      if (allocationDiff > inventoryLevel.available) {
        return { 
          success: false, 
          error: `Insufficient inventory. Available: ${inventoryLevel.available}, Requested: ${allocationDiff}` 
        }
      }

      // Update allocations
      channelAllocations[storeConnectionId] = quantity
      const newAllocated = inventoryLevel.allocated + allocationDiff
      const newAvailable = this.calculateAvailable(inventoryLevel.totalQuantity, newAllocated)

      await db.inventoryLevel.update({
        where: { id: inventoryLevelId },
        data: {
          channelAllocations: channelAllocations,
          allocated: newAllocated,
          available: newAvailable
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error allocating inventory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync inventory to BigCommerce
   */
  static async syncToBigCommerce(
    channelListingId: string,
    userId: string
  ): Promise<SyncResult> {
    try {
      const listing = await db.channelListing.findFirst({
        where: {
          id: channelListingId,
          userId,
          platform: 'BIGCOMMERCE'
        },
        include: {
          storeConnection: true,
          masterProduct: {
            include: {
              inventoryLevels: true,
              variants: {
                include: {
                  inventoryLevel: true
                }
              }
            }
          },
          channelVariants: {
            include: {
              masterVariant: {
                include: {
                  inventoryLevel: true
                }
              }
            }
          }
        }
      })

      if (!listing || !listing.externalId) {
        return {
          success: false,
          platform: 'BIGCOMMERCE',
          storeId: '',
          storeName: '',
          error: 'Channel listing not found or not published'
        }
      }

      const accessToken = decrypt(listing.storeConnection.accessToken)
      const storeHash = listing.storeConnection.externalStoreId

      // Get inventory level - check for product level or variant level
      let inventoryToSync = 0
      
      if (listing.channelVariants.length > 0) {
        // Has variants - sync each variant's inventory
        for (const channelVariant of listing.channelVariants) {
          const variantInventory = channelVariant.masterVariant.inventoryLevel
          if (variantInventory && variantInventory.trackInventory) {
            const channelAllocation = (variantInventory.channelAllocations as Record<string, number>)?.[listing.storeConnectionId] || variantInventory.available
            
            // Update variant inventory via BigCommerce API
            const response = await fetch(
              `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${listing.externalId}/variants/${channelVariant.externalId}`,
              {
                method: 'PUT',
                headers: {
                  'X-Auth-Token': accessToken,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  inventory_level: channelAllocation,
                  inventory_warning_level: variantInventory.lowStockThreshold
                })
              }
            )

            if (!response.ok) {
              console.error(`Failed to sync variant ${channelVariant.externalId}:`, await response.text())
            }
          }
        }
        inventoryToSync = listing.channelVariants.reduce((sum: number, cv: any) => {
          const inv = cv.masterVariant.inventoryLevel
          return sum + (inv ? (inv.channelAllocations as Record<string, number>)?.[listing.storeConnectionId] || inv.available : 0)
        }, 0)
      } else {
        // Simple product - sync product level inventory
        const productInventory = listing.masterProduct.inventoryLevels[0]
        if (productInventory && productInventory.trackInventory) {
          const channelAllocation = (productInventory.channelAllocations as Record<string, number>)?.[listing.storeConnectionId] || productInventory.available
          
          const response = await fetch(
            `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${listing.externalId}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Token': accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                inventory_level: channelAllocation,
                inventory_warning_level: productInventory.lowStockThreshold,
                inventory_tracking: 'product'
              })
            }
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
              success: false,
              platform: 'BIGCOMMERCE',
              storeId: listing.storeConnectionId,
              storeName: listing.storeConnection.storeName,
              externalId: listing.externalId,
              error: `BigCommerce API error: ${response.status}`
            }
          }
          
          inventoryToSync = channelAllocation
        }
      }

      return {
        success: true,
        platform: 'BIGCOMMERCE',
        storeId: listing.storeConnectionId,
        storeName: listing.storeConnection.storeName,
        externalId: listing.externalId,
        quantitySynced: inventoryToSync
      }
    } catch (error) {
      console.error('Error syncing to BigCommerce:', error)
      return {
        success: false,
        platform: 'BIGCOMMERCE',
        storeId: '',
        storeName: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync inventory to Shopify
   */
  static async syncToShopify(
    channelListingId: string,
    userId: string
  ): Promise<SyncResult> {
    try {
      const listing = await db.channelListing.findFirst({
        where: {
          id: channelListingId,
          userId,
          platform: 'SHOPIFY'
        },
        include: {
          storeConnection: true,
          masterProduct: {
            include: {
              inventoryLevels: true,
              variants: {
                include: {
                  inventoryLevel: true
                }
              }
            }
          },
          channelVariants: {
            include: {
              masterVariant: {
                include: {
                  inventoryLevel: true
                }
              }
            }
          }
        }
      })

      if (!listing || !listing.externalId) {
        return {
          success: false,
          platform: 'SHOPIFY',
          storeId: '',
          storeName: '',
          error: 'Channel listing not found or not published'
        }
      }

      const accessToken = decrypt(listing.storeConnection.accessToken)
      const shopDomain = listing.storeConnection.storeUrl || listing.storeConnection.externalStoreId

      // First, get location ID (required for inventory updates)
      const locationsResponse = await fetch(
        `https://${shopDomain}/admin/api/2024-01/locations.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Accept': 'application/json'
          }
        }
      )

      if (!locationsResponse.ok) {
        return {
          success: false,
          platform: 'SHOPIFY',
          storeId: listing.storeConnectionId,
          storeName: listing.storeConnection.storeName,
          error: 'Failed to get Shopify location'
        }
      }

      const locationsData = await locationsResponse.json()
      const locationId = locationsData.locations?.[0]?.id

      if (!locationId) {
        return {
          success: false,
          platform: 'SHOPIFY',
          storeId: listing.storeConnectionId,
          storeName: listing.storeConnection.storeName,
          error: 'No Shopify location found'
        }
      }

      let inventoryToSync = 0

      // Get product details to get inventory item IDs
      const productResponse = await fetch(
        `https://${shopDomain}/admin/api/2024-01/products/${listing.externalId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Accept': 'application/json'
          }
        }
      )

      if (!productResponse.ok) {
        return {
          success: false,
          platform: 'SHOPIFY',
          storeId: listing.storeConnectionId,
          storeName: listing.storeConnection.storeName,
          error: 'Failed to get product details from Shopify'
        }
      }

      const productData = await productResponse.json()
      const shopifyVariants = productData.product?.variants || []

      // Sync inventory for each variant
      for (let i = 0; i < shopifyVariants.length; i++) {
        const shopifyVariant = shopifyVariants[i]
        const inventoryItemId = shopifyVariant.inventory_item_id
        
        if (!inventoryItemId) continue

        // Find corresponding channel variant or use product level inventory
        let quantityToSet = 0
        
        if (listing.channelVariants.length > 0 && listing.channelVariants[i]) {
          const channelVariant = listing.channelVariants[i]
          const variantInventory = channelVariant.masterVariant.inventoryLevel
          if (variantInventory && variantInventory.trackInventory) {
            quantityToSet = (variantInventory.channelAllocations as Record<string, number>)?.[listing.storeConnectionId] || variantInventory.available
          }
        } else {
          const productInventory = listing.masterProduct.inventoryLevels[0]
          if (productInventory && productInventory.trackInventory) {
            quantityToSet = (productInventory.channelAllocations as Record<string, number>)?.[listing.storeConnectionId] || productInventory.available
          }
        }

        // Update inventory level using Shopify's inventory API
        const inventoryResponse = await fetch(
          `https://${shopDomain}/admin/api/2024-01/inventory_levels/set.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              location_id: locationId,
              inventory_item_id: inventoryItemId,
              available: quantityToSet
            })
          }
        )

        if (!inventoryResponse.ok) {
          console.error(`Failed to sync variant inventory for ${inventoryItemId}:`, await inventoryResponse.text())
        } else {
          inventoryToSync += quantityToSet
        }
      }

      return {
        success: true,
        platform: 'SHOPIFY',
        storeId: listing.storeConnectionId,
        storeName: listing.storeConnection.storeName,
        externalId: listing.externalId,
        quantitySynced: inventoryToSync
      }
    } catch (error) {
      console.error('Error syncing to Shopify:', error)
      return {
        success: false,
        platform: 'SHOPIFY',
        storeId: '',
        storeName: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync inventory to all channels for a master product
   */
  static async syncToAllChannels(
    masterProductId: string,
    userId: string
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = []

    try {
      const masterProduct = await db.masterProduct.findFirst({
        where: {
          id: masterProductId,
          userId
        },
        include: {
          channelListings: {
            where: {
              publishStatus: 'published',
              externalId: { not: null }
            }
          }
        }
      })

      if (!masterProduct) {
        return [{
          success: false,
          platform: 'BIGCOMMERCE' as Platform,
          storeId: '',
          storeName: '',
          error: 'Master product not found'
        }]
      }

      // Sync to each published channel
      for (const listing of masterProduct.channelListings) {
        let result: SyncResult

        if (listing.platform === 'BIGCOMMERCE') {
          result = await this.syncToBigCommerce(listing.id, userId)
        } else if (listing.platform === 'SHOPIFY') {
          result = await this.syncToShopify(listing.id, userId)
        } else {
          result = {
            success: false,
            platform: listing.platform,
            storeId: listing.storeConnectionId,
            storeName: 'Unknown',
            error: 'Platform not supported'
          }
        }

        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error syncing to all channels:', error)
      return [{
        success: false,
        platform: 'BIGCOMMERCE' as Platform,
        storeId: '',
        storeName: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    }
  }

  /**
   * Get products with low stock
   */
  static async getLowStockProducts(userId: string, limit: number = 50) {
    // Get all inventory levels and filter in JavaScript
    // (Prisma doesn't support comparing two fields in WHERE clause)
    const allInventory = await db.inventoryLevel.findMany({
      where: {
        userId,
        trackInventory: true
      },
      include: {
        masterProduct: {
          select: {
            id: true,
            title: true,
            baseSKU: true,
            basePrice: true
          }
        },
        masterVariant: {
          select: {
            id: true,
            sku: true,
            optionValues: true,
            masterProduct: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        available: 'asc'
      }
    })

    // Filter where available <= lowStockThreshold
    return allInventory
      .filter(inv => inv.available <= inv.lowStockThreshold)
      .slice(0, limit)
  }

  /**
   * Create or update inventory level for a product/variant
   */
  static async upsertInventoryLevel(
    data: {
      userId: string
      masterProductId?: string
      masterVariantId?: string
      totalQuantity: number
      lowStockThreshold?: number
      safetyStock?: number
      trackInventory?: boolean
      allowBackorder?: boolean
    }
  ) {
    const {
      userId,
      masterProductId,
      masterVariantId,
      totalQuantity,
      lowStockThreshold = 5,
      safetyStock = 0,
      trackInventory = true,
      allowBackorder = false
    } = data

    const available = this.calculateAvailable(totalQuantity, 0)

    // Check if inventory level exists
    const existing = await db.inventoryLevel.findFirst({
      where: masterProductId 
        ? { masterProductId, userId }
        : { masterVariantId, userId }
    })

    if (existing) {
      return await db.inventoryLevel.update({
        where: { id: existing.id },
        data: {
          totalQuantity,
          available,
          lowStockThreshold,
          safetyStock,
          trackInventory,
          allowBackorder
        }
      })
    }

    return await db.inventoryLevel.create({
      data: {
        userId,
        masterProductId,
        masterVariantId,
        totalQuantity,
        allocated: 0,
        available,
        lowStockThreshold,
        safetyStock,
        trackInventory,
        allowBackorder
      }
    })
  }
}