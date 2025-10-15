/**
 * BigCommerce to TikTok Shop Data Transformer
 * Converts BigCommerce product data to TikTok Shop product format
 */

import { Product, MasterProduct } from '@prisma/client'

export interface TikTokProductData {
  title: string
  description: string
  category_id: string
  brand_id?: string
  main_images: Array<{ uri: string }>
  video?: { uri: string; cover_image_uri?: string }
  package_weight: {
    value: string
    unit: 'KILOGRAM' | 'POUND'
  }
  package_dimensions: {
    length: string
    width: string
    height: string
    unit: 'CENTIMETER' | 'INCH'
  }
  is_cod_allowed?: boolean
  delivery_option_ids?: string[]
  product_certifications?: Array<{
    id: string
    images: Array<{ uri: string }>
    files: Array<{ id: string; name: string }>
  }>
  size_chart?: {
    image: { uri: string }
  }
}

export interface TikTokSKUData {
  skus: Array<{
    id?: string
    seller_sku?: string
    sales_attributes: Array<{
      attribute_id: string
      attribute_name: string
      value_id: string
      value_name: string
    }>
    inventory: Array<{
      warehouse_id: string
      quantity: number
    }>
    price: {
      amount: string
      currency: 'USD'
    }
    original_price?: {
      amount: string
      currency: 'USD'
    }
  }>
}

export interface TikTokSalesAttribute {
  id: string
  name: string
  values: Array<{
    id: string
    name: string
  }>
}

/**
 * Transform BigCommerce Product to TikTok Shop product format
 */
export function transformProductToTikTok(
  product: Product,
  tiktokCategoryId: string,
  warehouseId: string,
  brandId?: string
): TikTokProductData {
  const platformData = product.platformData as any
  const images = product.images as any
  const customFields = product.customFields as any

  // Build title (TikTok max 255 characters)
  const title = product.name.substring(0, 255)

  // Build description (TikTok max 5000 characters)
  const description = buildTikTokDescription(product)

  // Prepare images (TikTok requires at least 1, max 9)
  const mainImages = prepareMainImages(images)

  // Get package weight and dimensions
  const packageWeight = {
    value: (customFields?.weight || 1).toString(),
    unit: 'POUND' as const,
  }

  const packageDimensions = {
    length: (customFields?.length || customFields?.height || 12).toString(),
    width: (customFields?.width || 12).toString(),
    height: (customFields?.depth || customFields?.height || 1).toString(),
    unit: 'INCH' as const,
  }

  return {
    title,
    description,
    category_id: tiktokCategoryId,
    brand_id: brandId,
    main_images: mainImages,
    package_weight: packageWeight,
    package_dimensions: packageDimensions,
    is_cod_allowed: false, // Cash on delivery
  }
}

/**
 * Transform BigCommerce variants to TikTok SKUs
 */
export function transformVariantsToTikTokSKUs(
  product: Product,
  warehouseId: string
): TikTokSKUData {
  const variants = product.variants as any
  const basePrice = Number(product.price)

  if (!variants?.variants || variants.variants.length === 0) {
    // Single SKU product
    return {
      skus: [
        {
          seller_sku: product.sku || `SKU-${product.externalId}`,
          sales_attributes: [],
          inventory: [
            {
              warehouse_id: warehouseId,
              quantity: 100, // Default quantity
            },
          ],
          price: {
            amount: basePrice.toFixed(2),
            currency: 'USD',
          },
          original_price: product.compareAtPrice
            ? {
                amount: Number(product.compareAtPrice).toFixed(2),
                currency: 'USD',
              }
            : undefined,
        },
      ],
    }
  }

  const bcVariants = variants.variants

  // Transform each variant to TikTok SKU
  const skus = bcVariants.map((variant: any) => {
    const salesAttributes: Array<{
      attribute_id: string
      attribute_name: string
      value_id: string
      value_name: string
    }> = []

    // Map BigCommerce option values to TikTok sales attributes
    if (variant.option_values && Array.isArray(variant.option_values)) {
      variant.option_values.forEach((opt: any, index: number) => {
        salesAttributes.push({
          attribute_id: `attr_${index}`, // In production, use actual TikTok attribute IDs
          attribute_name: opt.option_display_name,
          value_id: `val_${index}_${opt.id}`,
          value_name: opt.label,
        })
      })
    }

    return {
      seller_sku: variant.sku || `SKU-${variant.id}`,
      sales_attributes: salesAttributes,
      inventory: [
        {
          warehouse_id: warehouseId,
          quantity: variant.inventory_level || 100,
        },
      ],
      price: {
        amount: (variant.price || basePrice).toFixed(2),
        currency: 'USD' as const,
      },
      original_price: variant.retail_price || variant.sale_price
        ? {
            amount: Number(variant.retail_price || variant.sale_price).toFixed(2),
            currency: 'USD' as const,
          }
        : undefined,
    }
  })

  return { skus }
}

/**
 * Extract sales attributes from BigCommerce product for TikTok
 */
export function extractSalesAttributes(product: Product): TikTokSalesAttribute[] {
  const variants = product.variants as any
  const customFields = product.customFields as any

  const attributesMap = new Map<string, Set<string>>()

  // Extract from variants
  if (variants?.variants && Array.isArray(variants.variants)) {
    variants.variants.forEach((variant: any) => {
      if (variant.option_values && Array.isArray(variant.option_values)) {
        variant.option_values.forEach((opt: any) => {
          const attrName = opt.option_display_name
          const attrValue = opt.label

          if (!attributesMap.has(attrName)) {
            attributesMap.set(attrName, new Set())
          }
          attributesMap.get(attrName)!.add(attrValue)
        })
      }
    })
  }

  // Extract from options (for products without variants created yet)
  if (customFields?.options && Array.isArray(customFields.options)) {
    customFields.options.forEach((option: any, optIndex: number) => {
      const attrName = option.display_name || option.name
      
      if (option.option_values && Array.isArray(option.option_values)) {
        if (!attributesMap.has(attrName)) {
          attributesMap.set(attrName, new Set())
        }
        
        option.option_values.forEach((val: any) => {
          attributesMap.get(attrName)!.add(val.label)
        })
      }
    })
  }

  // Convert to TikTok format
  const attributes: TikTokSalesAttribute[] = []
  let attrIndex = 0

  attributesMap.forEach((values, name) => {
    const attribute: TikTokSalesAttribute = {
      id: `attr_${attrIndex}`,
      name: name,
      values: Array.from(values).map((value, valIndex) => ({
        id: `val_${attrIndex}_${valIndex}`,
        name: value,
      })),
    }
    attributes.push(attribute)
    attrIndex++
  })

  return attributes
}

/**
 * Build TikTok-formatted description
 */
function buildTikTokDescription(product: Product): string {
  let description = product.description || ''

  const customFields = product.customFields as any

  // Add product highlights section
  description += '\n\n✨ PRODUCT HIGHLIGHTS:\n'

  // Add materials
  const materials = extractMaterials(product)
  if (materials.length > 0) {
    description += `• Materials: ${materials.join(', ')}\n`
  }

  // Add dimensions
  if (customFields?.width && customFields?.height) {
    description += `• Size: ${customFields.width}" x ${customFields.height}"`
    if (customFields.depth) {
      description += ` x ${customFields.depth}"`
    }
    description += '\n'
  }

  // Add weight
  if (customFields?.weight) {
    description += `• Weight: ${customFields.weight} lbs\n`
  }

  // Add brand
  if (customFields?.brand_name) {
    description += `• Brand: ${customFields.brand_name}\n`
  }

  // Add care instructions
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    const careField = customFields.custom_fields.find(
      (f: any) => f.name.toLowerCase().includes('care') || f.name.toLowerCase().includes('washing')
    )
    if (careField) {
      description += `\n🧼 CARE INSTRUCTIONS:\n${careField.value}\n`
    }
  }

  // TikTok max 5000 characters
  return description.substring(0, 5000)
}

/**
 * Prepare main product images for TikTok
 */
function prepareMainImages(images: any): Array<{ uri: string }> {
  const imageUris: Array<{ uri: string }> = []

  if (images?.images && Array.isArray(images.images)) {
    images.images.forEach((img: any) => {
      const uri = img.url_standard || img.url || img.image_url
      if (uri) {
        imageUris.push({ uri })
      }
    })
  }

  // TikTok requires at least 1 image, allows up to 9
  if (imageUris.length === 0) {
    // Use placeholder if no images
    imageUris.push({ uri: 'https://via.placeholder.com/800' })
  }

  return imageUris.slice(0, 9)
}

/**
 * Extract materials from product
 */
function extractMaterials(product: Product): string[] {
  const materials: string[] = []
  const customFields = product.customFields as any

  // Check custom fields
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    const materialField = customFields.custom_fields.find(
      (f: any) => f.name.toLowerCase().includes('material')
    )
    if (materialField?.value) {
      materials.push(materialField.value)
    }
  }

  // Extract from description
  const description = (product.description || '').toLowerCase()
  const commonMaterials = [
    'cotton', 'polyester', 'silk', 'wool', 'linen', 'leather',
    'metal', 'stainless steel', 'plastic', 'glass', 'ceramic',
  ]

  commonMaterials.forEach(material => {
    if (description.includes(material) && !materials.some(m => m.toLowerCase() === material)) {
      materials.push(material.charAt(0).toUpperCase() + material.slice(1))
    }
  })

  return materials
}

/**
 * Build product specification for TikTok
 */
export function buildProductSpecification(product: Product): Array<{ key: string; value: string }> {
  const specs: Array<{ key: string; value: string }> = []
  const customFields = product.customFields as any

  // Add basic specs
  if (product.sku) {
    specs.push({ key: 'SKU', value: product.sku })
  }

  if (customFields?.brand_name) {
    specs.push({ key: 'Brand', value: customFields.brand_name })
  }

  if (customFields?.condition) {
    specs.push({ key: 'Condition', value: customFields.condition })
  }

  // Add dimensions
  if (customFields?.width && customFields?.height) {
    let dimensions = `${customFields.width}" x ${customFields.height}"`
    if (customFields.depth) {
      dimensions += ` x ${customFields.depth}"`
    }
    specs.push({ key: 'Dimensions', value: dimensions })
  }

  if (customFields?.weight) {
    specs.push({ key: 'Weight', value: `${customFields.weight} lbs` })
  }

  // Add custom fields as specs
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    customFields.custom_fields.forEach((field: any) => {
      if (field.name && field.value) {
        specs.push({ key: field.name, value: field.value })
      }
    })
  }

  return specs
}