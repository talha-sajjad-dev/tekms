/**
 * Etsy Publisher Service
 * Publishes products from database to Etsy marketplace
 */

import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import {
  transformProductToEtsyListing,
  transformVariantsToEtsyInventory,
  prepareEtsyImages,
} from '@/lib/transformers/bigcommerce-to-etsy'

interface PublishResult {
  success: boolean
  externalId?: string
  error?: string
  details?: any
}

/**
 * Publish a product to Etsy
 */
export async function publishToEtsy(
  productId: string,
  storeConnectionId: string,
  userId: string,
  etsyTaxonomyId: number,
  shippingTemplateId?: number
): Promise<PublishResult> {
  try {
    console.log(`📤 Publishing product ${productId} to Etsy store ${storeConnectionId}`)

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
        platform: 'ETSY',
        isActive: true,
      },
    })

    if (!store) {
      return {
        success: false,
        error: 'Etsy store connection not found or inactive',
      }
    }

    // 3. Check if already published to this store
    const existingListing = await db.channelListing.findFirst({
      where: {
        userId: userId,
        storeConnectionId: storeConnectionId,
        // Link via legacy Product table for now
      },
    })

    if (existingListing && existingListing.publishStatus === 'published') {
      return {
        success: false,
        error: 'Product already published to this store',
        details: { channelListingId: existingListing.id },
      }
    }

    // 4. Transform product to Etsy format
    const etsyListing = transformProductToEtsyListing(
      product,
      etsyTaxonomyId,
      shippingTemplateId
    )

    // 5. Get Etsy API credentials
    const accessToken = decrypt(store.accessToken)
    const shopId = store.externalStoreId

    // 6. Upload images first (Etsy requires this before creating listing)
    const imageUrls = prepareEtsyImages(product)
    const uploadedImageIds: number[] = []

    for (const imageUrl of imageUrls) {
      try {
        const imageId = await uploadEtsyImage(accessToken, shopId, imageUrl)
        if (imageId) {
          uploadedImageIds.push(imageId)
        }
      } catch (imgError) {
        console.warn(`Failed to upload image ${imageUrl}:`, imgError)
        // Continue with other images
      }
    }

    // 7. Create the listing
    const listingData = {
      ...etsyListing,
      image_ids: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
    }

    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Etsy API error:', errorData)

      return {
        success: false,
        error: `Etsy API error: ${response.status} ${response.statusText}`,
        details: errorData,
      }
    }

    const result = await response.json()
    const listingId = result.listing_id?.toString()

    if (!listingId) {
      return {
        success: false,
        error: 'No listing ID returned from Etsy',
        details: result,
      }
    }

    // 8. Create inventory for variants (if product has variants)
    const inventory = transformVariantsToEtsyInventory(product, Number(product.price))

    if (inventory) {
      try {
        await updateEtsyInventory(accessToken, listingId, inventory)
      } catch (invError) {
        console.error('Failed to update Etsy inventory:', invError)
        // Don't fail the publish, but log the error
      }
    }

    // 9. Publish the listing (make it active)
    try {
      await publishEtsyListing(accessToken, shopId, listingId)
    } catch (publishError) {
      console.error('Failed to publish Etsy listing:', publishError)
    }

    // 10. Create channel listing in database
    const channelListing = existingListing
      ? await db.channelListing.update({
          where: { id: existingListing.id },
          data: {
            externalId: listingId,
            publishStatus: 'published',
            publishError: null,
            lastPushedAt: new Date(),
            platformData: result as any,
          },
        })
      : await db.channelListing.create({
          data: {
            userId: userId,
            storeConnectionId: storeConnectionId,
            platform: 'ETSY',
            externalId: listingId,
            publishStatus: 'published',
            lastPushedAt: new Date(),
            platformData: result as any,
          },
        })

    // 11. Log the change
    await db.changeLog.create({
      data: {
        userId: userId,
        entityType: 'channel_listing',
        entityId: channelListing.id,
        field: 'publish',
        oldValue: null as any,
        newValue: {
          externalId: listingId,
          platform: 'ETSY',
          storeName: store.storeName,
        } as any,
        source: 'user',
        platform: 'ETSY',
      },
    }).catch(console.error)

    console.log(`✅ Successfully published product to Etsy`)
    console.log(`   Listing ID: ${listingId}`)
    console.log(`   URL: https://www.etsy.com/listing/${listingId}`)

    return {
      success: true,
      externalId: listingId,
      details: {
        channelListingId: channelListing.id,
        listingUrl: `https://www.etsy.com/listing/${listingId}`,
        uploadedImages: uploadedImageIds.length,
      },
    }
  } catch (error) {
    console.error('Error publishing to Etsy:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

/**
 * Upload an image to Etsy
 */
async function uploadEtsyImage(
  accessToken: string,
  shopId: string,
  imageUrl: string
): Promise<number | null> {
  try {
    // Download the image
    const imageResponse = await fetch(imageUrl)
    const imageBlob = await imageResponse.blob()

    // Upload to Etsy
    const formData = new FormData()
    formData.append('image', imageBlob)

    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/images`,
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY || '',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }

    const result = await response.json()
    return result.listing_image_id || null
  } catch (error) {
    console.error('Error uploading image to Etsy:', error)
    return null
  }
}

/**
 * Update listing inventory (for variants)
 */
async function updateEtsyInventory(
  accessToken: string,
  listingId: string,
  inventory: any
): Promise<void> {
  const response = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
    {
      method: 'PUT',
      headers: {
        'x-api-key': process.env.ETSY_API_KEY || '',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inventory),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Failed to update inventory: ${JSON.stringify(errorData)}`)
  }
}

/**
 * Publish (activate) an Etsy listing
 */
async function publishEtsyListing(
  accessToken: string,
  shopId: string,
  listingId: string
): Promise<void> {
  const response = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': process.env.ETSY_API_KEY || '',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: 'active',
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to publish listing: ${response.statusText}`)
  }
}

/**
 * Update an existing Etsy listing
 */
export async function updateEtsyListing(
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
    const shopId = listing.storeConnection.externalStoreId
    const listingId = listing.externalId

    // Transform product updates
    const etsyListing = transformProductToEtsyListing(
      product,
      5000, // Default taxonomy ID, should be retrieved from listing
      undefined
    )

    // Update the listing
    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`,
      {
        method: 'PATCH',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(etsyListing),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Etsy API error: ${response.status}`,
        details: errorData,
      }
    }

    const result = await response.json()

    // Update channel listing
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        lastPushedAt: new Date(),
        platformData: result,
      },
    })

    return {
      success: true,
      externalId: listingId,
      details: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Unpublish (deactivate) an Etsy listing
 */
export async function unpublishFromEtsy(
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
    const shopId = listing.storeConnection.externalStoreId
    const listingId = listing.externalId

    // Set listing to inactive
    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`,
      {
        method: 'PATCH',
        headers: {
          'x-api-key': process.env.ETSY_API_KEY || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: 'inactive',
        }),
      }
    )

    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        error: `Etsy API error: ${response.status}`,
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