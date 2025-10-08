import { EtsyProductData } from '../etsy/scraper'
import { SEOContent } from '../seo/content-generator'
import { ProcessedTags } from '../seo/tag-processor'

// BigCommerce API configuration
const STORE_HASH = process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"
const ACCESS_TOKEN = process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx"
const API_URL = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`

const headers = {
  "Content-Type": "application/json",
  "X-Auth-Token": ACCESS_TOKEN as string,
  Accept: "application/json",
}

export interface ProductCreationOptions {
  etsyData: EtsyProductData
  seoContent: SEOContent
  processedTags: ProcessedTags
  selectedCategories: number[]
  selectedModifiers: number[]
  selectedVariantOptions: (string | number)[]
  selectedColors?: string[] // Add manual color selections
  pricing: {
    price: number
    salePrice?: number
    costPrice?: number
  }
  inventory: {
    trackInventory: boolean
    inventoryLevel?: number
  }
  visibility: boolean
}

export interface ProductCreationResult {
  success: boolean
  productId?: number
  productUrl?: string
  sku?: string
  error?: string
  warnings?: string[]
}

export interface BigCommerceCategory {
  id: number
  name: string
  parent_id: number
  sort_order: number
  is_visible: boolean
}

export interface SharedModifier {
  id: number
  name: string
  display_name: string
  type: string
  required: boolean
  sort_order: number
  config?: any
  option_values?: Array<{
    id: number
    label: string
    sort_order: number
    value_data?: any
  }>
}

// Price adjuster rules for modifiers
const MODIFIER_PRICE_RULES = {
  "Shirt Size": {
    "2X-Large": 4.00,
    "3X-Large": 6.00
  },
  "Shirt Style": {
    "Women Vneck": 2.00,
    "Women Tanktop": 2.00,
    "Women Long Sleeve": 6.00,
    "Unisex Long Sleeve": 6.00,
    "Unisex Sweatshirts": 6.00,
    "Unisex Hoodie": 10.00
  }
} as const

/**
 * Helper function to get price adjuster for a modifier value
 */
function getPriceAdjuster(modifierName: string, valueLabel: string): number | null {
  // Normalize the modifier name to match our rules
  const normalizedModifierName = modifierName.replace(/[^a-zA-Z\s]/g, '').trim()
  
  // Check each rule category
  for (const [ruleCategory, rules] of Object.entries(MODIFIER_PRICE_RULES)) {
    if (normalizedModifierName.toLowerCase().includes(ruleCategory.toLowerCase().replace(/\s+/g, ' '))) {
      // Check if the value label matches any rule
      for (const [ruleValue, price] of Object.entries(rules)) {
        if (valueLabel.toLowerCase().includes(ruleValue.toLowerCase())) {
          return price
        }
      }
    }
  }
  
  return null
}

export class ProductCreator {
  static async createProductFromEtsy(options: ProductCreationOptions): Promise<ProductCreationResult> {
    const { etsyData, seoContent, processedTags, selectedCategories, selectedModifiers, selectedVariantOptions, selectedColors = [], pricing, inventory, visibility } = options
    
    console.log(`🆕 Creating new product from Etsy data: ${etsyData.title}`)

    try {
      // Step 1: Create the product data (no SKU needed)
      const productData = this.buildProductData(
        etsyData,
        seoContent,
        processedTags,
        selectedCategories,
        pricing,
        inventory,
        visibility
      )

      // Step 3: Create the product
      console.log('🚀 Creating product in BigCommerce...')
      const createdProduct = await this.createProduct(productData)

      if (!createdProduct.success || !createdProduct.productId) {
        throw new Error(createdProduct.error || 'Failed to create product')
      }

      // Step 4: Apply selected modifiers
      if (selectedModifiers.length > 0) {
        console.log(`⚙️ Applying ${selectedModifiers.length} shared modifiers...`)
        await this.applySharedModifiers(createdProduct.productId, selectedModifiers)
      }

      // Step 5: Apply selected variant options
      if (selectedVariantOptions.length > 0) {
        console.log(`🔧 Applying ${selectedVariantOptions.length} shared variant options...`)
        await this.applySharedVariantOptions(createdProduct.productId, selectedVariantOptions)
      }

      // Step 5.5: Apply manual color options
      if (selectedColors.length > 0) {
        console.log(`🎨 Creating manual color options: ${selectedColors.length} colors...`)
        await this.createManualColorOptions(createdProduct.productId, selectedColors)
      }

      // Step 6: Handle images
      if (etsyData.images.length > 0) {
        console.log('🖼️ Processing product images...')
        await this.handleProductImages(createdProduct.productId, etsyData.images, seoContent.imageAltTexts)
      }

      console.log(`✅ Product created successfully: ID ${createdProduct.productId}`)

      return {
        success: true,
        productId: createdProduct.productId,
        productUrl: `/products/${etsyData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`,
        warnings: createdProduct.warnings
      }

    } catch (error) {
      console.error('❌ Product creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }


  private static buildProductData(
    etsyData: EtsyProductData,
    seoContent: SEOContent,
    processedTags: ProcessedTags,
    selectedCategories: number[],
    pricing: ProductCreationOptions['pricing'],
    inventory: ProductCreationOptions['inventory'],
    visibility: boolean
  ): any {
    // Create URL slug from title (full slug with leading slash)
    const urlSlug = '/' + etsyData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      + '/'

    return {
      name: etsyData.title,
      description: etsyData.description, // Use original HTML description from Etsy
      type: 'physical', // Required field for BigCommerce
      price: pricing.price,
      sale_price: pricing.salePrice || 0,
      cost_price: pricing.costPrice || 0,
      weight: 10, // Default weight in ounces
      width: 10.00, // Default width in inches
      height: 10.00, // Default height in inches
      depth: 2, // Default depth in inches
      categories: selectedCategories,
      is_visible: visibility,
      inventory_level: inventory.inventoryLevel || 0,
      inventory_tracking: inventory.trackInventory ? 'product' : 'none',
      
      // SEO fields
      meta_title: seoContent.metaTitle,
      meta_description: seoContent.metaDescription,
      search_keywords: seoContent.searchKeywords,
      page_title: seoContent.pageTitle,
      custom_url: {
        url: urlSlug,
        is_customized: true
      }
    }
  }

  private static async createProduct(productData: any): Promise<{
    success: boolean
    productId?: number
    error?: string
    warnings?: string[]
  }> {
    try {
      console.log(`🚀 Creating product: "${productData.name}" with SKU: "${productData.sku}"`)
      
      const response = await fetch(`${API_URL}/catalog/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`BigCommerce API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      
      return {
        success: true,
        productId: result.data?.id,
        warnings: result.warnings || []
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static async applySharedModifiers(productId: number, modifierIds: number[]): Promise<void> {
    try {
      for (const modifierId of modifierIds) {
        try {
          console.log(`📋 Applying shared modifier ID: ${modifierId}`)

          // Apply the shared modifier directly by ID using the shared modifiers endpoint
          const applyResponse = await fetch(
            `${API_URL}/catalog/shared-modifiers/${modifierId}/apply`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                product_ids: [productId]
              })
            }
          )

          if (applyResponse.ok) {
            const result = await applyResponse.json()
            console.log(`✅ Applied shared modifier ${modifierId} to product ${productId}`)
            console.log(`📊 Apply result:`, result)
          } else {
            // If the apply endpoint doesn't work, try the alternative method
            console.log(`⚠️ Direct apply failed, trying alternative method for modifier ${modifierId}`)
            
            // Fetch the shared modifier details first
            const modifierResponse = await fetch(
              `${API_URL}/catalog/shared-modifiers/${modifierId}`,
              { headers }
            )

            if (!modifierResponse.ok) {
              console.warn(`Could not fetch shared modifier ${modifierId}: ${modifierResponse.status}`)
              continue
            }

            const modifierData = await modifierResponse.json()
            const modifier = modifierData.data

            if (!modifier) {
              console.warn(`No modifier data found for ID ${modifierId}`)
              continue
            }

            console.log(`📋 Creating modifier from shared: ${modifier.storefront_name || modifier.name}`)

            // Create modifier payload from shared modifier data with price adjusters
            const modifierName = modifier.storefront_name || modifier.name
            const modifierPayload = {
              display_name: modifierName,
              type: modifier.type,
              required: modifier.required || false,
              sort_order: modifier.sort_order || 0,
              config: modifier.config || {},
              option_values: (modifier.values || []).map((value: any) => {
                const optionValue: any = {
                  label: value.label,
                  sort_order: value.sort_order || 0,
                  is_default: value.is_default || false,
                  value_data: value.value_data || null
                }

                // Check if this option value should have a price adjuster
                const priceAdjustment = getPriceAdjuster(modifierName, value.label)
                if (priceAdjustment !== null) {
                  console.log(`💰 Adding price adjuster: ${value.label} +$${priceAdjustment}`)
                  optionValue.adjusters = {
                    price: {
                      adjuster: "relative",
                      adjuster_value: priceAdjustment
                    }
                  }
                }

                return optionValue
              })
            }

            console.log(`🔧 Modifier payload:`, JSON.stringify(modifierPayload, null, 2))

            const createResponse = await fetch(
              `${API_URL}/catalog/products/${productId}/modifiers`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(modifierPayload)
              }
            )

            if (createResponse.ok) {
              const createResult = await createResponse.json()
              console.log(`✅ Created modifier from shared: ${modifier.storefront_name || modifier.name}`)
              console.log(`🆔 New modifier ID: ${createResult.data?.id}`)
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.warn(`⚠️ Failed to create modifier from shared: ${modifier.storefront_name || modifier.name}`)
              console.warn(`❌ Error details:`, errorData)
            }
          }

        } catch (error) {
          console.warn(`Error applying shared modifier ${modifierId}:`, error)
        }
      }

    } catch (error) {
      console.error('Error applying shared modifiers:', error)
    }
  }

  private static async applySharedVariantOptions(productId: number, variantOptionIds: (string | number)[]): Promise<void> {
    try {
      for (const variantOptionId of variantOptionIds) {
        try {
          // Fetch the option details
          const optionResponse = await fetch(
            `${API_URL}/catalog/options/${variantOptionId}`,
            { headers }
          )

          if (!optionResponse.ok) {
            console.warn(`Could not fetch option ${variantOptionId}: ${optionResponse.status}`)
            continue
          }

          const optionData = await optionResponse.json()
          const option = optionData.data

          if (!option) {
            console.warn(`No option data found for ID ${variantOptionId}`)
            continue
          }

          console.log(`📋 Applying shared color option: ${option.display_name || option.name || 'Unknown'}`)

          // Apply the option to the product with full data
          const optionPayload = {
            display_name: option.display_name || option.name,
            type: option.type,
            sort_order: option.sort_order || 0,
            option_values: option.option_values || []
          }

          const applyResponse = await fetch(
            `${API_URL}/catalog/products/${productId}/options`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(optionPayload)
            }
          )

          if (applyResponse.ok) {
            console.log(`✅ Applied shared color option: ${option.display_name || option.name}`)
          } else {
            const errorData = await applyResponse.json().catch(() => ({}))
            console.warn(`⚠️ Failed to apply shared color option: ${option.display_name || option.name}`, errorData)
          }

        } catch (error) {
          console.warn(`Error applying shared variant option ${variantOptionId}:`, error)
        }
      }

    } catch (error) {
      console.error('Error applying shared variant options:', error)
    }
  }

  private static async createManualColorOptions(productId: number, selectedColors: string[]): Promise<void> {
    try {
      console.log(`🎨 Creating manual color swatch option for product ${productId} with ${selectedColors.length} colors`)

      // Common color name to hex code mapping
      const colorHexMap: Record<string, string> = {
        'black': '#000000',
        'white': '#FFFFFF',
        'red': '#FF0000',
        'blue': '#0000FF',
        'green': '#008000',
        'yellow': '#FFFF00',
        'purple': '#800080',
        'pink': '#FFC0CB',
        'orange': '#FFA500',
        'brown': '#A52A2A',
        'gray': '#808080',
        'grey': '#808080',
        'navy': '#000080',
        'maroon': '#800000',
        'teal': '#008080',
        'olive': '#808000',
        'lime': '#00FF00',
        'aqua': '#00FFFF',
        'silver': '#C0C0C0',
        'gold': '#FFD700',
        'beige': '#F5F5DC',
        'tan': '#D2B48C',
        'khaki': '#F0E68C',
        'coral': '#FF7F50',
        'salmon': '#FA8072',
        'crimson': '#DC143C',
        'magenta': '#FF00FF',
        'cyan': '#00FFFF',
        'indigo': '#4B0082',
        'violet': '#EE82EE'
      }

      // Create option values for each selected color with hex codes
      const optionValues = selectedColors.map((colorName, index) => {
        const normalizedColorName = colorName.toLowerCase().trim()
        const hexCode = colorHexMap[normalizedColorName] || '#808080' // Default to gray if color not found
        
        console.log(`🎨 Color mapping: ${colorName} → ${hexCode}`)
        
        return {
          label: colorName,
          sort_order: index,
          is_default: index === 0,
          value_data: {
            colors: [hexCode]
          }
        }
      })

      // Create the color swatch option
      const optionPayload = {
        display_name: "Color",
        type: "swatch", // Use swatch type for color swatches with hex codes
        sort_order: 0,
        option_values: optionValues
      }

      console.log(`🔧 Color swatch payload:`, JSON.stringify(optionPayload, null, 2))

      const response = await fetch(
        `${API_URL}/catalog/products/${productId}/options`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(optionPayload)
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Created manual color swatch option with ${selectedColors.length} colors`)
        console.log(`🆔 Option ID: ${result.data?.id}`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn(`⚠️ Failed to create manual color swatch option:`, errorData)
      }

    } catch (error) {
      console.error('Error creating manual color swatch options:', error)
    }
  }

  private static async handleProductImages(
    productId: number,
    imageUrls: string[],
    altTexts: string[]
  ): Promise<void> {
    try {
      // Import the ImageProcessor dynamically to avoid circular dependencies
      const { ImageProcessor } = await import('../etsy/image-processor')
      
      // Process and upload images
      const results = await ImageProcessor.processAndUploadImages(
        productId,
        imageUrls,
        altTexts
      )

      const successCount = results.filter(r => r.success).length
      console.log(`📸 Uploaded ${successCount}/${imageUrls.length} images`)

    } catch (error) {
      console.error('Error handling product images:', error)
    }
  }

  // Helper methods for UI
  static async getCategories(): Promise<BigCommerceCategory[]> {
    try {
      const response = await fetch(`${API_URL}/catalog/categories?limit=250`, {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []

    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  static async getSharedModifiers(): Promise<SharedModifier[]> {
    try {
      const response = await fetch(`${API_URL}/catalog/shared-modifiers?limit=250`, {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch shared modifiers: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []

    } catch (error) {
      console.error('Error fetching shared modifiers:', error)
      return []
    }
  }

  static async getSharedVariantOptions(): Promise<any[]> {
    try {
      console.log('📋 Fetching shared product options...')
      
      // Target specific shared option IDs that are commonly used
      const knownSharedOptionIds = [8, 9, 10, 11, 12] // Test a range to find available ones
      const sharedOptions = []
      
      for (const optionId of knownSharedOptionIds) {
        try {
          const response = await fetch(`${API_URL}/catalog/options/${optionId}`, {
            headers,
            cache: "no-store",
          })

          if (response.ok) {
            const data = await response.json()
            if (data.data) {
              sharedOptions.push(data.data)
              console.log(`✅ Found shared option: ${data.data.display_name || data.data.name} (ID: ${optionId})`)
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch option ${optionId}:`, error)
        }
      }
      
      console.log(`📋 Found ${sharedOptions.length} shared product options`)
      return sharedOptions

    } catch (error) {
      console.error('Error fetching shared product options:', error)
      return []
    }
  }

  static validateProductData(productData: any): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Required fields
    if (!productData.name || productData.name.trim().length === 0) {
      errors.push('Product name is required')
    }

    if (!productData.description || productData.description.trim().length === 0) {
      errors.push('Product description is required')
    }

    if (!productData.price || productData.price <= 0) {
      errors.push('Product price must be greater than 0')
    }

    if (!productData.sku || productData.sku.trim().length === 0) {
      errors.push('Product SKU is required')
    }

    // Length validations
    if (productData.name && productData.name.length > 250) {
      errors.push('Product name is too long (max 250 characters)')
    }

    if (productData.meta_title && productData.meta_title.length > 60) {
      errors.push('Meta title is too long (max 60 characters)')
    }

    if (productData.meta_description && productData.meta_description.length > 160) {
      errors.push('Meta description is too long (max 160 characters)')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
