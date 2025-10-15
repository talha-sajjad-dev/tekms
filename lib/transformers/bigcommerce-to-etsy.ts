/**
 * BigCommerce to Etsy Data Transformer
 * Converts BigCommerce product data to Etsy listing format
 */

import { Product, MasterProduct } from '@prisma/client'

export interface EtsyListingData {
  quantity: number
  title: string
  description: string
  price: number
  who_made: 'i_did' | 'someone_else' | 'collective'
  when_made: string
  taxonomy_id: number
  shipping_template_id?: number
  shop_section_id?: number
  tags?: string[]
  materials?: string[]
  is_customizable?: boolean
  personalization_is_required?: boolean
  personalization_char_count_max?: number
  personalization_instructions?: string
  production_partner_ids?: number[]
  image_ids?: number[]
  is_supply?: boolean
  is_digital?: boolean
  should_auto_renew?: boolean
  shipping_profile_id?: number
  return_policy_id?: number
  processing_min?: number
  processing_max?: number
}

export interface EtsyVariation {
  property_id: number
  value_ids?: number[]
  values?: string[]
  scale_id?: number
  recipient_id?: number
}

export interface EtsyInventory {
  products: Array<{
    sku?: string
    property_values?: Array<{
      property_id: number
      values: string[]
      value_ids?: number[]
      scale_id?: number
    }>
    offerings: Array<{
      price: number
      quantity: number
      is_enabled: boolean
    }>
  }>
  price_on_property?: number[]
  quantity_on_property?: number[]
  sku_on_property?: number[]
}

/**
 * Transform BigCommerce Product to Etsy Listing format
 */
export function transformProductToEtsyListing(
  product: Product,
  etsyTaxonomyId: number,
  shippingTemplateId?: number
): EtsyListingData {
  // Extract data from platformData
  const platformData = product.platformData as any
  const images = product.images as any
  const variants = product.variants as any
  const customFields = product.customFields as any

  // Build title (max 140 characters for Etsy)
  const title = product.name.substring(0, 140)

  // Build description (max 65,535 characters)
  const description = buildEtsyDescription(product)

  // Extract materials from description or custom fields
  const materials = extractMaterials(product)

  // Build tags (max 13 tags, 20 characters each)
  const tags = buildEtsyTags(product)

  // Check if product has personalization options (from modifiers)
  const personalization = extractPersonalization(customFields)

  return {
    quantity: platformData?.inventory_level || 1,
    title,
    description,
    price: Number(product.price),
    who_made: 'i_did', // Default, can be customized
    when_made: '2020_2024', // Default recent
    taxonomy_id: etsyTaxonomyId,
    shipping_template_id: shippingTemplateId,
    tags: tags.slice(0, 13), // Etsy max 13 tags
    materials: materials.slice(0, 13), // Etsy max 13 materials
    is_customizable: personalization.hasPersonalization,
    personalization_is_required: personalization.isRequired,
    personalization_char_count_max: personalization.maxChars,
    personalization_instructions: personalization.instructions,
    is_supply: false,
    is_digital: platformData?.type === 'digital',
    should_auto_renew: true,
    processing_min: 1,
    processing_max: 3,
  }
}

/**
 * Transform BigCommerce variants to Etsy variations
 */
export function transformVariantsToEtsyInventory(
  product: Product,
  basePrice: number
): EtsyInventory | null {
  const variants = product.variants as any
  const customFields = product.customFields as any

  if (!variants?.variants || variants.variants.length === 0) {
    return null
  }

  const bcVariants = variants.variants

  // Extract unique option names (Color, Size, etc.)
  const optionMap = new Map<string, Set<string>>()
  
  bcVariants.forEach((variant: any) => {
    if (variant.option_values) {
      variant.option_values.forEach((opt: any) => {
        const optionName = opt.option_display_name
        if (!optionMap.has(optionName)) {
          optionMap.set(optionName, new Set())
        }
        optionMap.get(optionName)!.add(opt.label)
      })
    }
  })

  // Map BigCommerce options to Etsy property IDs
  // Note: In production, you'd need to map these to actual Etsy property IDs
  // For now, using placeholder IDs (200 for Size, 504 for Color, etc.)
  const propertyIdMap: Record<string, number> = {
    'Size': 200,
    'Color': 504,
    'Material': 94,
    'Style': 62809,
  }

  // Build Etsy inventory products
  const products = bcVariants.map((variant: any) => {
    const propertyValues: Array<{
      property_id: number
      values: string[]
    }> = []

    if (variant.option_values) {
      variant.option_values.forEach((opt: any) => {
        const optionName = opt.option_display_name
        const propertyId = propertyIdMap[optionName] || 513 // 513 = Other

        propertyValues.push({
          property_id: propertyId,
          values: [opt.label],
        })
      })
    }

    return {
      sku: variant.sku || undefined,
      property_values: propertyValues,
      offerings: [
        {
          price: variant.price ? Number(variant.price) : basePrice,
          quantity: variant.inventory_level || 1,
          is_enabled: true,
        },
      ],
    }
  })

  return {
    products,
  }
}

/**
 * Build Etsy-formatted description
 */
function buildEtsyDescription(product: Product): string {
  let description = product.description || ''

  // Add product details section
  const customFields = product.customFields as any
  if (customFields?.weight || customFields?.dimensions) {
    description += '\n\n📦 PRODUCT DETAILS:\n'
    
    if (customFields.weight) {
      description += `• Weight: ${customFields.weight} lbs\n`
    }
    
    if (customFields.width && customFields.height) {
      description += `• Dimensions: ${customFields.width}" x ${customFields.height}"`
      if (customFields.depth) {
        description += ` x ${customFields.depth}"`
      }
      description += '\n'
    }
  }

  // Add brand if available
  if (customFields?.brand_name) {
    description += `\n🏷️ BRAND: ${customFields.brand_name}\n`
  }

  // Add care instructions or additional info from custom fields
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    const careField = customFields.custom_fields.find(
      (f: any) => f.name.toLowerCase().includes('care') || f.name.toLowerCase().includes('instructions')
    )
    if (careField) {
      description += `\n🧼 CARE INSTRUCTIONS:\n${careField.value}\n`
    }
  }

  return description.substring(0, 65535) // Etsy max
}

/**
 * Extract materials from product data
 */
function extractMaterials(product: Product): string[] {
  const materials: string[] = []
  const customFields = product.customFields as any

  // Check custom fields for materials
  if (customFields?.custom_fields && Array.isArray(customFields.custom_fields)) {
    const materialField = customFields.custom_fields.find(
      (f: any) => f.name.toLowerCase().includes('material')
    )
    if (materialField?.value) {
      materials.push(materialField.value.substring(0, 45)) // Etsy max 45 chars per material
    }
  }

  // Extract from description
  const description = (product.description || '').toLowerCase()
  const commonMaterials = [
    'cotton', 'polyester', 'silk', 'wool', 'linen', 'leather',
    'metal', 'wood', 'plastic', 'glass', 'ceramic', 'paper',
  ]

  commonMaterials.forEach(material => {
    if (description.includes(material) && !materials.includes(material)) {
      materials.push(material)
    }
  })

  return materials.slice(0, 13).map(m => m.substring(0, 45))
}

/**
 * Build Etsy tags from product data
 */
function buildEtsyTags(product: Product): string[] {
  const tags: string[] = []

  // Use existing tags
  if (product.tags && Array.isArray(product.tags)) {
    product.tags.forEach(tag => {
      // Etsy tags max 20 characters
      const cleanTag = tag.substring(0, 20).toLowerCase()
      if (cleanTag && !tags.includes(cleanTag)) {
        tags.push(cleanTag)
      }
    })
  }

  // Extract from title
  const titleWords = product.name.toLowerCase().split(/\s+/)
  titleWords.forEach(word => {
    if (word.length >= 3 && word.length <= 20 && !tags.includes(word)) {
      // Filter out common words
      const skipWords = ['the', 'and', 'for', 'with', 'this', 'that']
      if (!skipWords.includes(word)) {
        tags.push(word)
      }
    }
  })

  return tags.slice(0, 13)
}

/**
 * Extract personalization info from product modifiers
 */
function extractPersonalization(customFields: any): {
  hasPersonalization: boolean
  isRequired: boolean
  maxChars: number
  instructions: string
} {
  const result = {
    hasPersonalization: false,
    isRequired: false,
    maxChars: 0,
    instructions: '',
  }

  if (!customFields?.modifiers || !Array.isArray(customFields.modifiers)) {
    return result
  }

  // Look for text input modifiers (personalization)
  const textModifiers = customFields.modifiers.filter(
    (m: any) => m.type === 'text' || m.type === 'multi_line_text'
  )

  if (textModifiers.length > 0) {
    result.hasPersonalization = true
    
    // Check if any are required
    result.isRequired = textModifiers.some((m: any) => m.required)
    
    // Get max character count
    const maxLengths = textModifiers
      .map((m: any) => m.config?.text_max_length || 0)
      .filter((l: number) => l > 0)
    
    if (maxLengths.length > 0) {
      result.maxChars = Math.max(...maxLengths)
    } else {
      result.maxChars = 100 // Default
    }
    
    // Build instructions
    const instructions = textModifiers.map((m: any) => 
      m.display_name || m.name
    ).join(', ')
    
    result.instructions = `Please provide: ${instructions}`
  }

  return result
}

/**
 * Transform image URLs for Etsy
 */
export function prepareEtsyImages(product: Product): string[] {
  const images = product.images as any
  const imageUrls: string[] = []

  if (images?.images && Array.isArray(images.images)) {
    images.images.forEach((img: any) => {
      // Etsy prefers original/large images
      const url = img.url_standard || img.url || img.image_url
      if (url) {
        imageUrls.push(url)
      }
    })
  }

  // Etsy allows up to 10 images
  return imageUrls.slice(0, 10)
}