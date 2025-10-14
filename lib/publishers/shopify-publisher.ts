import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

/**
 * Shopify Publisher Service
 * Transforms master products to Shopify format and creates them via API
 */

interface PublishResult {
  success: boolean
  externalId?: string
  error?: string
  details?: any
}

interface ShopifyProduct {
  title: string
  body_html: string
  vendor?: string
  product_type?: string
  tags?: string
  variants?: Array<{
    option1?: string
    option2?: string
    option3?: string
    price: string
    sku?: string
    inventory_quantity?: number
    weight?: number
    weight_unit?: 'g' | 'kg' | 'oz' | 'lb'
    requires_shipping?: boolean
    taxable?: boolean
    compare_at_price?: string
    inventory_management?: 'shopify' | null
    fulfillment_service?: 'manual'
    inventory_policy?: 'deny' | 'continue'
  }>
  options?: Array<{
    name: string
    values: string[]
  }>
  images?: Array<{
    src: string
    alt?: string
  }>
  status?: 'active' | 'draft' | 'archived'
}

/**
 * Publish a master product to Shopify
 */
export async function publishToShopify(
  masterProductId: string,
  storeConnectionId: string,
  userId: string
): Promise<PublishResult> {
  try {
    console.log(`📤 Publishing master product ${masterProductId} to Shopify store ${storeConnectionId}`)
    
    // 1. Get master product with all details
    const masterProduct = await db.masterProduct.findFirst({
      where: {
        id: masterProductId,
        userId: userId
      },
      include: {
        variants: true,
        inventoryLevels: true,
        template: true
      }
    })
    
    if (!masterProduct) {
      return {
        success: false,
        error: 'Master product not found'
      }
    }
    
    // 2. Get store connection
    const store = await db.storeConnection.findFirst({
      where: {
        id: storeConnectionId,
        userId: userId,
        platform: 'SHOPIFY',
        isActive: true
      }
    })
    
    if (!store) {
      return {
        success: false,
        error: 'Shopify store connection not found or inactive'
      }
    }
    
    // 3. Check if already published to this store
    const existingListing = await db.channelListing.findFirst({
      where: {
        masterProductId: masterProductId,
        storeConnectionId: storeConnectionId
      }
    })
    
    if (existingListing && existingListing.publishStatus === 'published') {
      return {
        success: false,
        error: 'Product already published to this store',
        details: { channelListingId: existingListing.id }
      }
    }
    
    // 4. Transform master product to Shopify format
    const shopifyProduct = transformToShopifyFormat(masterProduct)
    
    // 5. Create product via Shopify API
    const accessToken = decrypt(store.accessToken)
    const shopDomain = store.storeUrl || store.externalStoreId
    
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ product: shopifyProduct })
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Shopify API error:', errorData)
      
      return {
        success: false,
        error: `Shopify API error: ${response.status} ${response.statusText}`,
        details: errorData
      }
    }
    
    const result = await response.json()
    const externalId = result.product?.id?.toString()
    
    if (!externalId) {
      return {
        success: false,
        error: 'No product ID returned from Shopify',
        details: result
      }
    }
    
    // 6. Create or update channel listing
    const channelListing = existingListing
      ? await db.channelListing.update({
          where: { id: existingListing.id },
          data: {
            externalId: externalId,
            publishStatus: 'published',
            publishError: null,
            lastPushedAt: new Date(),
            platformData: result.product
          }
        })
      : await db.channelListing.create({
          data: {
            userId: userId,
            masterProductId: masterProductId,
            storeConnectionId: storeConnectionId,
            platform: 'SHOPIFY',
            externalId: externalId,
            publishStatus: 'published',
            lastPushedAt: new Date(),
            platformData: result.product
          }
        })
    
    // 7. Create channel variants if master has variants
    if (masterProduct.variants.length > 0 && result.product?.variants) {
      for (let i = 0; i < masterProduct.variants.length; i++) {
        const masterVariant = masterProduct.variants[i]
        const shopifyVariant = result.product.variants?.[i]
        
        if (shopifyVariant?.id) {
          await db.channelVariant.create({
            data: {
              masterVariantId: masterVariant.id,
              channelListingId: channelListing.id,
              externalId: shopifyVariant.id.toString(),
              platformSKU: shopifyVariant.sku,
              platformPrice: shopifyVariant.price ? parseFloat(shopifyVariant.price) : null,
              platformData: shopifyVariant
            }
          }).catch(console.error)
        }
      }
    }
    
    // 8. Log the change
    await db.changeLog.create({
      data: {
        userId: userId,
        entityType: 'channel_listing',
        entityId: channelListing.id,
        field: 'publish',
        oldValue: null,
        newValue: {
          externalId: externalId,
          platform: 'SHOPIFY',
          storeName: store.storeName
        },
        source: 'user',
        platform: 'SHOPIFY'
      }
    }).catch(console.error)
    
    console.log(`✅ Successfully published product ${masterProduct.title} to Shopify`)
    console.log(`   External ID: ${externalId}`)
    console.log(`   Channel Listing ID: ${channelListing.id}`)
    
    return {
      success: true,
      externalId: externalId,
      details: {
        channelListingId: channelListing.id,
        productUrl: `https://${shopDomain}/admin/products/${externalId}`
      }
    }
    
  } catch (error) {
    console.error('Error publishing to Shopify:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }
  }
}

/**
 * Transform master product to Shopify format
 */
function transformToShopifyFormat(masterProduct: any): ShopifyProduct {
  const images = masterProduct.images?.images || masterProduct.images || []
  
  const shopifyProduct: ShopifyProduct = {
    title: masterProduct.title,
    body_html: masterProduct.description || '',
    product_type: masterProduct.category || '',
    tags: masterProduct.tags?.join(', ') || '',
    status: masterProduct.status === 'PUBLISHED' ? 'active' : 'draft',
    
    // Images
    images: Array.isArray(images) ? images.map((img: any) => ({
      src: img.url_standard || img.url || img,
      alt: img.description || masterProduct.title
    })) : []
  }
  
  // Handle variants
  if (masterProduct.variants.length > 0) {
    // Extract unique option names and values
    const optionsMap: Record<string, Set<string>> = {}
    
    masterProduct.variants.forEach((variant: any) => {
      const optionValues = variant.optionValues as Record<string, string>
      Object.entries(optionValues).forEach(([key, value]) => {
        if (!optionsMap[key]) {
          optionsMap[key] = new Set()
        }
        optionsMap[key].add(value as string)
      })
    })
    
    // Create options array (Shopify supports up to 3 options)
    shopifyProduct.options = Object.entries(optionsMap)
      .slice(0, 3)
      .map(([name, values]) => ({
        name,
        values: Array.from(values)
      }))
    
    // Create variants array
    shopifyProduct.variants = masterProduct.variants.map((variant: any) => {
      const optionValues = variant.optionValues as Record<string, string>
      const optionKeys = Object.keys(optionValues)
      
      return {
        option1: optionValues[optionKeys[0]] || null,
        option2: optionValues[optionKeys[1]] || null,
        option3: optionValues[optionKeys[2]] || null,
        price: (variant.price ? Number(variant.price) : Number(masterProduct.basePrice)).toFixed(2),
        compare_at_price: variant.compareAtPrice 
          ? Number(variant.compareAtPrice).toFixed(2) 
          : masterProduct.compareAtPrice 
            ? Number(masterProduct.compareAtPrice).toFixed(2)
            : undefined,
        sku: variant.sku,
        inventory_quantity: 100, // Default inventory
        inventory_management: 'shopify',
        inventory_policy: 'deny',
        fulfillment_service: 'manual',
        requires_shipping: true,
        taxable: true,
        weight: masterProduct.template?.weight ? Number(masterProduct.template.weight) : 1,
        weight_unit: 'lb'
      }
    })
  } else {
    // Single variant (no options)
    shopifyProduct.variants = [{
      price: Number(masterProduct.basePrice).toFixed(2),
      compare_at_price: masterProduct.compareAtPrice 
        ? Number(masterProduct.compareAtPrice).toFixed(2) 
        : undefined,
      sku: masterProduct.baseSKU,
      inventory_quantity: 100,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      fulfillment_service: 'manual',
      requires_shipping: true,
      taxable: true,
      weight: masterProduct.template?.weight ? Number(masterProduct.template.weight) : 1,
      weight_unit: 'lb'
    }]
  }
  
  return shopifyProduct
}

/**
 * Update an existing Shopify product
 */
export async function updateShopifyProduct(
  channelListingId: string,
  userId: string
): Promise<PublishResult> {
  try {
    const listing = await db.channelListing.findFirst({
      where: {
        id: channelListingId,
        userId: userId
      },
      include: {
        masterProduct: {
          include: {
            variants: true
          }
        },
        storeConnection: true
      }
    })
    
    if (!listing || !listing.externalId) {
      return {
        success: false,
        error: 'Channel listing not found or not published'
      }
    }
    
    const shopifyProduct = transformToShopifyFormat(listing.masterProduct)
    const accessToken = decrypt(listing.storeConnection.accessToken)
    const shopDomain = listing.storeConnection.storeUrl || listing.storeConnection.externalStoreId
    
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products/${listing.externalId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ product: shopifyProduct })
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Shopify API error: ${response.status}`,
        details: errorData
      }
    }
    
    const result = await response.json()
    
    // Update listing
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        lastPushedAt: new Date(),
        platformData: result.product
      }
    })
    
    return {
      success: true,
      externalId: listing.externalId,
      details: result.product
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Unpublish (delete) product from Shopify
 */
export async function unpublishFromShopify(
  channelListingId: string,
  userId: string
): Promise<PublishResult> {
  try {
    const listing = await db.channelListing.findFirst({
      where: {
        id: channelListingId,
        userId: userId
      },
      include: {
        storeConnection: true
      }
    })
    
    if (!listing || !listing.externalId) {
      return {
        success: false,
        error: 'Channel listing not found or not published'
      }
    }
    
    const accessToken = decrypt(listing.storeConnection.accessToken)
    const shopDomain = listing.storeConnection.storeUrl || listing.storeConnection.externalStoreId
    
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products/${listing.externalId}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        error: `Shopify API error: ${response.status}`
      }
    }
    
    // Update listing status
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        publishStatus: 'draft',
        externalId: null,
        lastPushedAt: new Date()
      }
    })
    
    return {
      success: true
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}