import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

/**
 * BigCommerce Publisher Service
 * Transforms master products to BigCommerce format and creates them via API
 */

interface PublishResult {
  success: boolean
  externalId?: string
  error?: string
  details?: any
}

interface BigCommerceProduct {
  name: string
  type: 'physical' | 'digital'
  sku: string
  description: string
  weight: number
  width?: number
  height?: number
  depth?: number
  price: number
  cost_price?: number
  retail_price?: number
  sale_price?: number
  map_price?: number
  tax_class_id?: number
  product_tax_code?: string
  categories?: number[]
  brand_id?: number
  inventory_level?: number
  inventory_warning_level?: number
  inventory_tracking?: 'none' | 'product' | 'variant'
  fixed_cost_shipping_price?: number
  is_free_shipping?: boolean
  is_visible?: boolean
  is_featured?: boolean
  related_products?: number[]
  warranty?: string
  bin_picking_number?: string
  layout_file?: string
  upc?: string
  search_keywords?: string
  availability?: string
  availability_description?: string
  gift_wrapping_options_type?: 'any' | 'none' | 'list'
  gift_wrapping_options_list?: number[]
  sort_order?: number
  condition?: 'New' | 'Used' | 'Refurbished'
  is_condition_shown?: boolean
  order_quantity_minimum?: number
  order_quantity_maximum?: number
  page_title?: string
  meta_keywords?: string[]
  meta_description?: string
  view_count?: number
  preorder_release_date?: string
  preorder_message?: string
  is_preorder_only?: boolean
  is_price_hidden?: boolean
  price_hidden_label?: string
  custom_url?: {
    url: string
    is_customized: boolean
  }
  open_graph_type?: 'product' | 'album' | 'book' | 'drink' | 'food' | 'game' | 'movie' | 'song' | 'tv_show'
  open_graph_title?: string
  open_graph_description?: string
  open_graph_use_meta_description?: boolean
  open_graph_use_product_name?: boolean
  open_graph_use_image?: boolean
  images?: Array<{
    is_thumbnail: boolean
    sort_order: number
    description?: string
    image_url: string
  }>
  videos?: Array<{
    title: string
    description?: string
    sort_order: number
    type: 'youtube'
    video_id: string
  }>
  variants?: Array<{
    sku?: string
    price?: number
    weight?: number
    purchasing_disabled?: boolean
    purchasing_disabled_message?: string
    image_url?: string
    cost_price?: number
    upc?: string
    inventory_level?: number
    inventory_warning_level?: number
    bin_picking_number?: string
    option_values?: Array<{
      option_display_name: string
      label: string
    }>
  }>
}

/**
 * Publish a master product to BigCommerce
 */
export async function publishToBigCommerce(
  masterProductId: string,
  storeConnectionId: string,
  userId: string
): Promise<PublishResult> {
  try {
    console.log(`📤 Publishing master product ${masterProductId} to BigCommerce store ${storeConnectionId}`)
    
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
        platform: 'BIGCOMMERCE',
        isActive: true
      }
    })
    
    if (!store) {
      return {
        success: false,
        error: 'BigCommerce store connection not found or inactive'
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
    
    // 4. Transform master product to BigCommerce format
    const bcProduct = transformToBigCommerceFormat(masterProduct)
    
    // 5. Create product via BigCommerce API
    const accessToken = decrypt(store.accessToken)
    const storeHash = store.externalStoreId
    
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bcProduct)
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('BigCommerce API error:', errorData)
      
      return {
        success: false,
        error: `BigCommerce API error: ${response.status} ${response.statusText}`,
        details: errorData
      }
    }
    
    const result = await response.json()
    const externalId = result.data?.id?.toString()
    
    if (!externalId) {
      return {
        success: false,
        error: 'No product ID returned from BigCommerce',
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
            platformData: result.data
          }
        })
      : await db.channelListing.create({
          data: {
            userId: userId,
            masterProductId: masterProductId,
            storeConnectionId: storeConnectionId,
            platform: 'BIGCOMMERCE',
            externalId: externalId,
            publishStatus: 'published',
            lastPushedAt: new Date(),
            platformData: result.data
          }
        })
    
    // 7. Create channel variants if master has variants
    if (masterProduct.variants.length > 0 && result.data?.variants) {
      for (let i = 0; i < masterProduct.variants.length; i++) {
        const masterVariant = masterProduct.variants[i]
        const bcVariant = result.data.variants?.[i]
        
        if (bcVariant?.id) {
          await db.channelVariant.create({
            data: {
              masterVariantId: masterVariant.id,
              channelListingId: channelListing.id,
              externalId: bcVariant.id.toString(),
              platformSKU: bcVariant.sku,
              platformPrice: bcVariant.price,
              platformData: bcVariant
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
          platform: 'BIGCOMMERCE',
          storeName: store.storeName
        },
        source: 'user',
        platform: 'BIGCOMMERCE'
      }
    }).catch(console.error)
    
    console.log(`✅ Successfully published product ${masterProduct.title} to BigCommerce`)
    console.log(`   External ID: ${externalId}`)
    console.log(`   Channel Listing ID: ${channelListing.id}`)
    
    return {
      success: true,
      externalId: externalId,
      details: {
        channelListingId: channelListing.id,
        productUrl: `https://store-${storeHash}.mybigcommerce.com/manage/products/${externalId}/edit`
      }
    }
    
  } catch (error) {
    console.error('Error publishing to BigCommerce:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }
  }
}

/**
 * Transform master product to BigCommerce format
 */
function transformToBigCommerceFormat(masterProduct: any): BigCommerceProduct {
  const images = masterProduct.images?.images || masterProduct.images || []
  
  const bcProduct: BigCommerceProduct = {
    name: masterProduct.title,
    type: 'physical',
    sku: masterProduct.baseSKU,
    description: masterProduct.description || '',
    weight: masterProduct.template?.weight ? Number(masterProduct.template.weight) : 1,
    price: Number(masterProduct.basePrice),
    retail_price: masterProduct.compareAtPrice ? Number(masterProduct.compareAtPrice) : undefined,
    inventory_tracking: masterProduct.variants.length > 0 ? 'variant' : 'product',
    inventory_level: 100, // Default inventory
    is_visible: masterProduct.status === 'PUBLISHED',
    is_featured: false,
    condition: 'New',
    categories: [], // Will be mapped via CategoryMapping later
    
    // SEO fields
    page_title: masterProduct.title,
    meta_description: masterProduct.description?.substring(0, 160),
    search_keywords: masterProduct.tags?.join(', '),
    
    // Images
    images: Array.isArray(images) ? images.map((img: any, index: number) => ({
      is_thumbnail: index === 0,
      sort_order: index,
      description: img.description || '',
      image_url: img.url_standard || img.url || img
    })) : []
  }
  
  // Add variants if present
  if (masterProduct.variants.length > 0) {
    bcProduct.variants = masterProduct.variants.map((variant: any, index: number) => {
      const optionValues = variant.optionValues as Record<string, string>
      
      return {
        sku: variant.sku,
        price: variant.price ? Number(variant.price) : Number(masterProduct.basePrice),
        weight: masterProduct.template?.weight ? Number(masterProduct.template.weight) : 1,
        inventory_level: 100,
        option_values: Object.entries(optionValues).map(([key, value]) => ({
          option_display_name: key,
          label: value as string
        }))
      }
    })
  }
  
  return bcProduct
}

/**
 * Update an existing BigCommerce product
 */
export async function updateBigCommerceProduct(
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
    
    const bcProduct = transformToBigCommerceFormat(listing.masterProduct)
    const accessToken = decrypt(listing.storeConnection.accessToken)
    const storeHash = listing.storeConnection.externalStoreId
    
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${listing.externalId}`,
      {
        method: 'PUT',
        headers: {
          'X-Auth-Token': accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bcProduct)
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `BigCommerce API error: ${response.status}`,
        details: errorData
      }
    }
    
    const result = await response.json()
    
    // Update listing
    await db.channelListing.update({
      where: { id: channelListingId },
      data: {
        lastPushedAt: new Date(),
        platformData: result.data
      }
    })
    
    return {
      success: true,
      externalId: listing.externalId,
      details: result.data
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Unpublish (delete) product from BigCommerce
 */
export async function unpublishFromBigCommerce(
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
    const storeHash = listing.storeConnection.externalStoreId
    
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${listing.externalId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        error: `BigCommerce API error: ${response.status}`
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