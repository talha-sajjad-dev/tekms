/**
 * TikTok Shop Publisher Service
 * Publishes products from database to TikTok Shop
 */

import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import {
  transformProductToTikTok,
  transformVariantsToTikTokSKUs,
  extractSalesAttributes,
  buildProductSpecification,
} from '@/lib/transformers/bigcommerce-to-tiktok'

interface PublishResult {
  success: boolean
  externalId?: string
  error?: string
  details?: any
}

/**
 * Publish a product to TikTok Shop
 */
export async function publishToTikTok(
  productId: string,
  storeConnectionId: string,
  userId: string,
  tiktokCategoryId: string,
  warehouseId: string,
  brandId?: string
): Promise<PublishResult> {
  try {
    console.log(`📤 Publishing product ${productId} to TikTok Shop ${storeConnectionId}`)

    // 1. Get product with all details
    const product = await db.product.findFirst({
      where: {
        id: productId,
        userId: userId,
      },
    })

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      }
    }

    // 2. Get store connection
    const store = await db.storeConnection.findFirst({
      where: {
        id: storeConnectionId,
        userId: userId,
        platform: 'TIKTOK',
        isActive: true,
      },
    })

    if (!store) {
      return {
        success: false,
        error: 'TikTok store connection not found or inactive',
      }
    }

    // 3. Check if already published to this store
    const existingListing = await db.channelListing.findFirst({
      where: {
        userId: userId,
        storeConnectionId: storeConnectionId,
      },
    })

    if (existingListing && existingListing.publishStatus === 'published') {
      return {
        success: false,
        error: 'Product already published to this store',
        details: { channelListingId: existingListing.id },
      }
    }

    // 4. Transform product to TikTok format
    const tiktokProduct = transformProductToTikTok(
      product,
      tiktokCategoryId,
      warehouseId,
      brandId
    )

    // 5. Transform variants to TikTok SKUs
    const tiktokSKUs = transformVariantsToTikTokSKUs(product, warehouseId)

    // 6. Get access token
    const accessToken = decrypt(store.accessToken)

    // 7. Create the product on TikTok
    const createProductPayload = {
      product_name: tiktokProduct.title,
      description: tiktokProduct.description,
      category_id: tiktokProduct.category_id,
      brand_id: tiktokProduct.brand_id,
      main_images: tiktokProduct.main_images,
      package_weight: tiktokProduct.package_weight,
      package_dimensions: tiktokProduct.package_dimensions,
      skus: tiktokSKUs.skus,
    }

    const response = await fetch(
      'https://open-api.tiktokglobalshop.com/product/202309/products',
      {
        method: 'POST',
        headers: {
          'x-tts-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createProductPayload),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('TikTok API error:', errorData)

      return {
        success: false,
        error: `TikTok API error: ${response.status} ${response.statusText}`,
        details: errorData,
      }
    }

    const result = await response.json()
    const productId_tiktok = result.data?.product_id?.toString()

    if (!productId_tiktok) {
      return {
        success: false,
        error: 'No product ID returned from TikTok',
        details: result,
      }
    }

    // 8. Activate the product (publish it)
    try {
      await activateTikTokProduct(accessToken, productId_tiktok)
    } catch (activateError) {
      console.error('Failed to activate TikTok product:', activateError)
      // Don't fail the publish, product is created but not active
    }

    // 9. Create channel listing in database
    const channelListing = existingListing
      ? await db.channelListing.update({
          where: { id: existingListing.id },
          data: {
            externalId: productId_tiktok,
            publishStatus: 'published',
            publishError: null,
            lastPushedAt: new Date(),
            platformData: result.data as any,
          },
        })
      : await db.channelListing.create({
          data: {
            userId: userId,
            storeConnectionId: storeConnectionId,
            platform: 'TIKTOK',
            externalId: productId_tiktok,
            publishStatus: 'published',
            lastPushedAt: new Date(),
            platformData: result.data as any,
          },
        })

    // 10. Log the change
    await db.changeLog.create({
      data: {
        userId: userId,
        entityType: 'channel_listing',
        entityId: channelListing.id,
        field: 'publish',
        oldValue: null as any,
        newValue: {
          externalId: productId_tiktok,
          platform: 'TIKTOK',
          storeName: store.storeName,
        } as any,
        source: 'user',
        platform: 'TIKTOK',
      },
    }).catch(console.error)

    console.log(`✅ Successfully published product to TikTok Shop`)
    console.log(`   Product ID: ${productId_tiktok}`)

    return {
      success: true,
      externalId: productId_tiktok,
      details: {
        channelListingId: channelListing.id,
        skuCount: tiktokSKUs.skus.length,
      },
    }
  } catch (error) {
    console.error('Error publishing to TikTok:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

/**
 * Activate (publish) a TikTok product
 */
async function activateTikTokProduct(
  accessToken: string,
  productId: string
): Promise<void> {
  const response = await fetch(
    `https://open-api.tiktokglobalshop.com/product/202309/products/${productId}/activate`,
    {
      method: 'POST',
      headers: {
        'x-tts-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Failed to activate product: ${JSON.stringify(errorData)}`)
  }
}

/**
 * Update an existing TikTok product
 */
export async function updateTikTokProduct(
  channelListingId: string,
  userId: string,
  tiktokCategoryId: string,
  warehouseId: string
): Promise<PublishResult> {
  try {
    const listing = await db.channelListing.findFirst({
      where: {
        id: channelListingId,
        userId: userId,
      },
      include: {
        storeConnection: true,
      },
    })

    if (!listing || !listing.externalId) {
      return {
        success: false,
        error: 'Channel listing not found or not published',
      }
    }

    // Get the original product
    const product = await db.product.findFirst({
      where: {
        channelListingId: channelListingId,
      },
    })

    if (!product) {
      return {
        success: false,
        error: 'Original product not found',
      }
    }

    const accessToken = decrypt(listing.storeConnection.accessToken)
    const productId = listing.externalId

    // Transform product updates
    const tiktokProduct = transformProductToTikTok(
      product,
      tiktokCategoryId,
      warehouseId
    )

    // Update the product
    const response = await fetch(
      `https://open-api.tiktokglobalshop.com/product/202309/products/${productId}`,
      {
        method: 'PUT',
        headers: {
          'x-tts-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: tiktokProduct.title,
          description: tiktokProduct.description,
          main_images: tiktokProduct.main_images,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `TikTok API error: ${response.status}`,
        details: errorData,
      }
    }

    const result = await response.json()

    // Update channel listing
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        lastPushedAt: new Date(),
        platformData: result.data as any,
      },
    })

    return {
      success: true,
      externalId: productId,
      details: result.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Deactivate (unpublish) a TikTok product
 */
export async function unpublishFromTikTok(
  channelListingId: string,
  userId: string
): Promise<PublishResult> {
  try {
    const listing = await db.channelListing.findFirst({
      where: {
        id: channelListingId,
        userId: userId,
      },
      include: {
        storeConnection: true,
      },
    })

    if (!listing || !listing.externalId) {
      return {
        success: false,
        error: 'Channel listing not found or not published',
      }
    }

    const accessToken = decrypt(listing.storeConnection.accessToken)
    const productId = listing.externalId

    // Deactivate the product
    const response = await fetch(
      `https://open-api.tiktokglobalshop.com/product/202309/products/${productId}/deactivate`,
      {
        method: 'POST',
        headers: {
          'x-tts-access-token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `TikTok API error: ${response.status}`,
        details: errorData,
      }
    }

    // Update listing status
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        publishStatus: 'draft',
        lastPushedAt: new Date(),
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update product inventory on TikTok
 */
export async function updateTikTokInventory(
  channelListingId: string,
  userId: string,
  warehouseId: string,
  inventoryUpdates: Array<{ sku: string; quantity: number }>
): Promise<PublishResult> {
  try {
    const listing = await db.channelListing.findFirst({
      where: {
        id: channelListingId,
        userId: userId,
      },
      include: {
        storeConnection: true,
      },
    })

    if (!listing || !listing.externalId) {
      return {
        success: false,
        error: 'Channel listing not found or not published',
      }
    }

    const accessToken = decrypt(listing.storeConnection.accessToken)
    const productId = listing.externalId

    // Update inventory for each SKU
    for (const update of inventoryUpdates) {
      const response = await fetch(
        `https://open-api.tiktokglobalshop.com/product/202309/products/${productId}/skus/${update.sku}/inventory`,
        {
          method: 'PUT',
          headers: {
            'x-tts-access-token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inventory: [
              {
                warehouse_id: warehouseId,
                quantity: update.quantity,
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        console.error(`Failed to update inventory for SKU ${update.sku}`)
      }
    }

    return {
      success: true,
      externalId: productId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}