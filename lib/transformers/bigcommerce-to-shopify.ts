/**
 * BigCommerce to Shopify Data Transformer
 * Converts BigCommerce product data to Shopify product format
 */

import { Product, MasterProduct } from '@prisma/client'

export interface ShopifyProductData {
  title: string
  body_html: string
  vendor?: string
  product_type?: string
  tags?: string[]
  status?: 'active' | 'draft' | 'archived'
  published_at?: string
  template_suffix?: string
  published_scope?: string
  variants: ShopifyVariant[]
  options?: ShopifyOption[]
  images?: ShopifyImage[]
  metafields?: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
}

export interface ShopifyVariant {
  option1?: string
  option2?: string
  option3?: string
  price: string
  compare_at_price?: string
  sku?: string
  barcode?: string
  inventory_management?: 'shopify' | null
  inventory_policy?: 'deny' | 'continue'
  fulfillment_service?: 'manual'
  inventory_quantity?: number
  weight?: number
  weight_unit?: 'lb' | 'oz' | 'kg' | 'g'
  requires_shipping?: boolean
  taxable?: boolean
  grams?: number
}

export interface ShopifyOption {
  name: string
  position: number
  values: string[]
}

export interface ShopifyImage {
  position?: number
  src: string
  alt?: string
  variant_ids?: number[]
}

/**
 * Transform BigCommerce Product to Shopify product format
 */
export function transformProductToShopify(product: Product): ShopifyProductData {
  const platformData = product.platformData as any
  const images = product.images as any
  const variants = product.variants as any
  const customFields = product.customFields as any

  // Build title
  const title = product.name

  // Build body_html (description)
  const body_html = buildShopifyDescription(product)

  // Extract vendor (brand)
  const vendor = customFields?.brand_name || undefined

  // Extract product type from categories
  const product_type = extractProductType(product)

  // Build tags
  const tags = buildShopifyTags(product)

  // Build variants
  const shopifyVariants = transformVariantsToShopify(product)

  // Build options
  const options = extractOptionsFromVariants(product)

  // Build images
  const shopifyImages = transformImagesToShopify(images)

  // Build metafields for additional data
  const metafields = buildMetafields(product)

  return {
    title,
    body_html,
    vendor,
    product_type,
    tags,
    status: platformData?.is_visible ? 'active' : 'draft',
    variants: shopifyVariants,
    options: options.length > 0 ? options : undefined,
    images: shopifyImages.length > 0 ? shopifyImages : undefined,
    metafields: metafields.length > 0 ? metafields : undefined,
  }
}

/**
 * Transform BigCommerce variants to Shopify variants
 */
function transformVariantsToShopify(product: Product): ShopifyVariant[] {
  const variants = product.variants as any
  const customFields = product.customFields as any
  const basePrice = Number(product.price)

  // If no variants, create a default variant
  if (!variants?.variants || variants.variants.length === 0) {
    return [
      {
        price: basePrice.toString(),
        compare_at_price: product.compareAtPrice
          ? Number(product.compareAtPrice).toString()
          : undefined,
        sku: product.sku || undefined,
        inventory_management: 'shopify',
        inventory_policy: 'deny',
        fulfillment_service: 'manual',
        inventory_quantity: 100, // Default
        weight: customFields?.weight ? Number(customFields.weight) : undefined,
        weight_unit: 'lb',
        requires_shipping: customFields?.type !== 'digital',
        taxable: true,
      },
    ]
  }

  const bcVariants = variants.variants

  return bcVariants.map((variant: any) => {
    // Extract option values (Shopify supports max 3 options)
    const optionValues = extractOptionValues(variant)

    return {
      option1: optionValues[0] || undefined,
      option2: optionValues[1] || undefined,
      option3: optionValues[2] || undefined,
      price: (variant.price || basePrice).toString(),
      compare_at_price: variant.retail_price || variant.sale_price
        ? Number(variant.retail_price || variant.sale_price).toString()
        : undefined,
      sku: variant.sku || undefined,
      barcode: variant.upc || undefined,
      inventory_management: 'shopify',
      inventory_policy: variant.purchasing_disabled ? 'deny' : 'continue',
      fulfillment_service: 'manual',
      inventory_quantity: variant.inventory_level || 100,
      weight: variant.weight || customFields?.weight || undefined,
      weight_unit: 'lb',
      requires_shipping: !variant.is_free_shipping && customFields?.type !== 'digital',
      taxable: true,
      grams: variant.weight ? Math.round(variant.weight * 453.592) : undefined, // Convert lbs to grams
    }
  })
}

/**
 * Extract option values from variant
 */
function extractOptionValues(variant: any): string[] {
  const values: string[] = []

  if (variant.option_values && Array.isArray(variant.option_values)) {
    // Shopify supports max 3 options
    variant.option_values.slice(0, 3).forEach((opt: any) => {
      values.push(opt.label)
    })
  }

  return values
}

/**
 * Extract unique options from all variants
 */
function extractOptionsFromVariants(product: Product): ShopifyOption[] {
  const variants = product.variants as any
  const customFields = product.customFields as any

  const optionsMap = new Map<string, Set<string>>()
  const optionsOrder: string[] = []

  // Extract from variants
  if (variants?.variants && Array.isArray(variants.variants)) {
    variants.variants.forEach((variant: any) => {
      if (variant.option_values && Array.isArray(variant.option_values)) {
        variant.option_values.forEach((opt: any) => {
          const optionName = opt.option_display_name

          if (!optionsMap.has(optionName)) {
            optionsMap.set(optionName, new Set())
            optionsOrder.push(optionName)
          }

          optionsMap.get(optionName)!.add(opt.label)
        })
      }
    })
  }

  // Extract from options (if variants not created yet)
  if (customFields?.options && Array.isArray(customFields.options)) {
    customFields.options.forEach((option: any) => {
      const optionName = option.display_name || option.name

      if (!optionsMap.has(optionName)) {
        optionsMap.set(optionName, new Set())
        optionsOrder.push(optionName)
      }

      if (option.option_values && Array.isArray(option.option_values)) {
        option.option_values.forEach((val: any) => {
          optionsMap.get(optionName)!.add(val.label)
        })
      }
    })
  }

  // Convert to Shopify format (max 3 options)
  const options: ShopifyOption[] = []
  optionsOrder.slice(0, 3).forEach((optionName, index) => {
    const values = Array.from(optionsMap.get(optionName) || [])
    if (values.length > 0) {
      options.push({
        name: optionName,
        position: index + 1,
        values: values,
      })
    }
  })

  return options
}

/**
 * Transform images to Shopify format
 */
function transformImagesToShopify(images: any): ShopifyImage[] {
  const shopifyImages: ShopifyImage[] = []

  if (images?.images && Array.isArray(images.images)) {
    images.images.forEach((img: any, index: number) => {
      const src = img.url_standard || img.url || img.image_url
      if (src) {
        shopifyImages.push({
          position: index + 1,
          src: src,
          alt: img.description || img.alt || undefined,
        })
      }
    })
  }

  return shopifyImages
}

/**
 * Build Shopify description HTML
 */
function buildShopifyDescription(product: Product): string {
  let html = product.description || ''

  const customFields = product.customFields as any

  // Add product specifications section
  if (customFields?.weight || customFields?.dimensions || customFields?.brand_name) {
    html += '\n\n<h3>Product Specifications</h3>\n<ul>\n'

    if (customFields.brand_name) {
      html += `<li><strong>Brand:</strong> ${customFields.brand_name}</li>\n`
    }

    if (customFields.weight) {
      html += `<li><strong>Weight:</strong> ${customFields.weight} lbs</li>\n`
    }

    if (customFields.width && customFields.height) {
      html += `<li><strong>Dimensions:</strong> ${customFields.width}" x ${customFields.height}"`
      if (customFields.depth) {
        html += ` x ${customFields.depth}"`
      }
      html += '</li>\n'
    }

    html += '</ul>\n'
  }

  // Add custom fields as additional info
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    const infoFields = customFields.custom_fields.filter(
      (f: any) => !f.name.toLowerCase().includes('internal')
    )

    if (infoFields.length > 0) {
      html += '\n<h3>Additional Information</h3>\n<ul>\n'
      infoFields.forEach((field: any) => {
        if (field.name && field.value) {
          html += `<li><strong>${field.name}:</strong> ${field.value}</li>\n`
        }
      })
      html += '</ul>\n'
    }
  }

  return html
}

/**
 * Extract product type from categories
 */
function extractProductType(product: Product): string | undefined {
  if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
    return product.categories[0]
  }

  // Try to extract from description or title
  const text = `${product.name} ${product.description || ''}`.toLowerCase()
  const commonTypes = ['t-shirt', 'hoodie', 'mug', 'poster', 'sticker', 'phone case', 'tote bag']

  for (const type of commonTypes) {
    if (text.includes(type)) {
      return type.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }

  return undefined
}

/**
 * Build Shopify tags from product data
 */
function buildShopifyTags(product: Product): string[] {
  const tags: string[] = []

  // Use existing tags
  if (product.tags && Array.isArray(product.tags)) {
    product.tags.forEach(tag => {
      if (tag && !tags.includes(tag)) {
        tags.push(tag)
      }
    })
  }

  // Add category as tag
  if (product.categories && Array.isArray(product.categories)) {
    product.categories.forEach(cat => {
      if (cat && !tags.includes(cat)) {
        tags.push(cat)
      }
    })
  }

  return tags
}

/**
 * Build Shopify metafields for additional data
 */
function buildMetafields(product: Product): Array<{
  namespace: string
  key: string
  value: string
  type: string
}> {
  const metafields: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }> = []

  const customFields = product.customFields as any

  // Store BigCommerce product ID
  metafields.push({
    namespace: 'bigcommerce',
    key: 'product_id',
    value: product.externalId,
    type: 'single_line_text_field',
  })

  // Store SKU
  if (product.sku) {
    metafields.push({
      namespace: 'custom',
      key: 'sku',
      value: product.sku,
      type: 'single_line_text_field',
    })
  }

  // Store brand
  if (customFields?.brand_name) {
    metafields.push({
      namespace: 'custom',
      key: 'brand',
      value: customFields.brand_name,
      type: 'single_line_text_field',
    })
  }

  // Store condition
  if (customFields?.condition) {
    metafields.push({
      namespace: 'custom',
      key: 'condition',
      value: customFields.condition,
      type: 'single_line_text_field',
    })
  }

  // Store modifiers as JSON (for future reference)
  if (customFields?.modifiers && Array.isArray(customFields.modifiers) && customFields.modifiers.length > 0) {
    metafields.push({
      namespace: 'bigcommerce',
      key: 'modifiers',
      value: JSON.stringify(customFields.modifiers),
      type: 'json',
    })
  }

  return metafields
}

/**
 * Map BigCommerce modifiers to Shopify product options or metafields
 * Shopify doesn't have exact equivalent of BC modifiers, so we store them as metafields
 */
export function extractModifiersForShopify(product: Product): Array<{
  name: string
  type: string
  required: boolean
  config: any
}> {
  const modifiers: Array<{
    name: string
    type: string
    required: boolean
    config: any
  }> = []

  const customFields = product.customFields as any

  if (customFields?.modifiers && Array.isArray(customFields.modifiers)) {
    customFields.modifiers.forEach((modifier: any) => {
      modifiers.push({
        name: modifier.display_name || modifier.name,
        type: modifier.type,
        required: modifier.required || false,
        config: modifier.config || {},
      })
    })
  }

  return modifiers
}