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

export interface DuplicationOptions {
  templateProductId: number
  etsyData: EtsyProductData
  seoContent: SEOContent
  processedTags: ProcessedTags
  preserveFields: string[]
  replaceImages: boolean
}

export interface DuplicationResult {
  success: boolean
  productId?: number
  productUrl?: string
  error?: string
  warnings?: string[]
}

export interface BigCommerceProduct {
  id?: number
  name: string
  description: string
  price: number
  sku: string
  weight?: number
  categories?: number[]
  brand_id?: number
  inventory_level?: number
  inventory_tracking?: string
  is_visible?: boolean
  meta_title?: string
  meta_description?: string
  search_keywords?: string
  page_title?: string
  custom_url?: {
    url: string
    is_customized: boolean
  }
  images?: Array<{
    image_url: string
    is_thumbnail: boolean
    sort_order: number
    description: string
  }>
  modifiers?: any[]
  variants?: any[]
  custom_fields?: any[]
  bulk_pricing_rules?: any[]
  [key: string]: any
}

export class ProductDuplicator {
  static async duplicateProduct(options: DuplicationOptions): Promise<DuplicationResult> {
    const { templateProductId, etsyData, seoContent, processedTags } = options
    
    console.log(`🔄 Duplicating product ${templateProductId} with Etsy data`)

    try {
      // Step 1: Fetch the template product
      console.log('📥 Fetching template product...')
      const templateProduct = await this.fetchTemplateProduct(templateProductId)
      
      if (!templateProduct) {
        throw new Error(`Template product ${templateProductId} not found`)
      }

      // Step 2: Create the new product data
      console.log('🔧 Creating new product data...')
      const newProductData = await this.mergeProductData(
        templateProduct,
        etsyData,
        seoContent,
        processedTags,
        options
      )

      // Step 3: Create the new product
      console.log('🆕 Creating new product in BigCommerce...')
      const createdProduct = await this.createProduct(newProductData)

      if (!createdProduct.success || !createdProduct.productId) {
        throw new Error(createdProduct.error || 'Failed to create product')
      }

      // Step 4: Handle images if needed
      if (options.replaceImages && etsyData.images.length > 0) {
        console.log('🖼️ Processing product images...')
        await this.handleProductImages(createdProduct.productId, etsyData.images, seoContent.imageAltTexts)
      }

      // Step 5: Copy modifiers if they exist
      if (templateProduct.modifiers && templateProduct.modifiers.length > 0) {
        console.log('⚙️ Copying product modifiers...')
        await this.copyModifiers(templateProductId, createdProduct.productId)
      }

      console.log(`✅ Product duplicated successfully: ID ${createdProduct.productId}`)

      return {
        success: true,
        productId: createdProduct.productId,
        productUrl: `/products/${seoContent.urlSlug}`,
        warnings: createdProduct.warnings
      }

    } catch (error) {
      console.error('❌ Product duplication failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static async fetchTemplateProduct(productId: number): Promise<BigCommerceProduct | null> {
    try {
      const response = await fetch(
        `${API_URL}/catalog/products/${productId}?include=images,modifiers,variants,custom_fields,bulk_pricing_rules`,
        {
          headers,
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch template product: ${response.status}`)
      }

      const data = await response.json()
      return data.data

    } catch (error) {
      console.error('Error fetching template product:', error)
      return null
    }
  }

  private static async generateUniqueSku(baseSku: string): Promise<string> {
    try {
      console.log(`🔢 Generating unique SKU from base: "${baseSku}"`)
      
      // Ensure we have a valid base SKU
      if (!baseSku || baseSku.trim() === '') {
        console.warn('Empty base SKU, using default prefix')
        baseSku = 'ETSY-IMPORT'
      }
      
      // Get all existing SKUs to find the highest number
      const response = await fetch(
        `${API_URL}/catalog/products?limit=250&include_fields=sku`,
        {
          headers,
          cache: "no-store",
        }
      )

      if (!response.ok) {
        console.warn('Could not fetch existing SKUs, using timestamp fallback')
        return `${baseSku}-${Date.now()}`
      }

      const data = await response.json()
      const products = data.data || []
      
      console.log(`📊 Found ${products.length} existing products to check for SKU conflicts`)
      
      // Extract numeric suffixes from ALL existing SKUs to find the highest number
      const skuNumbers: number[] = []
      
      products.forEach((product: any) => {
        if (product.sku) {
          // Look for any SKU that ends with numbers (regardless of prefix)
          const match = product.sku.match(/-(\d+)$/)
          if (match) {
            skuNumbers.push(parseInt(match[1], 10))
          }
        }
      })

      // Find the highest number across ALL SKUs and increment
      let nextNumber = 1
      if (skuNumbers.length > 0) {
        nextNumber = Math.max(...skuNumbers) + 1
        console.log(`📈 Highest existing SKU number: ${Math.max(...skuNumbers)}, using: ${nextNumber}`)
      } else {
        console.log('📈 No numbered SKUs found, starting with: 1')
      }

      // Generate new SKU with incremented number
      const newSku = `${baseSku}-${nextNumber.toString().padStart(4, '0')}`
      console.log(`✅ Generated unique SKU: ${newSku}`)
      
      return newSku

    } catch (error) {
      console.warn('Error generating unique SKU:', error)
      // Fallback to timestamp-based SKU
      const fallbackSku = `${baseSku || 'ETSY'}-${Date.now()}`
      console.log(`🔄 Using fallback SKU: ${fallbackSku}`)
      return fallbackSku
    }
  }

  private static async mergeProductData(
    template: BigCommerceProduct,
    etsyData: EtsyProductData,
    seoContent: SEOContent,
    processedTags: ProcessedTags,
    options: DuplicationOptions
  ): Promise<Omit<BigCommerceProduct, 'id'>> {
    // Start with template data (excluding ID)
    const { id, ...templateData } = template

    console.log(`🔍 Template product SKU: "${template.sku}"`)
    console.log(`🔍 Template product name: "${template.name}"`)

    // Generate a unique SKU
    const uniqueSku = await this.generateUniqueSku(template.sku)
    console.log(`🔧 Generated unique SKU: "${uniqueSku}"`)

    // Fields to replace with Etsy data
    const newProductData: Omit<BigCommerceProduct, 'id'> = {
      ...templateData,
      
      // Replace with Etsy data
      name: etsyData.title,
      description: seoContent.enhancedDescription,
      
      // Generate unique SKU - CRITICAL: This must override template SKU
      sku: uniqueSku,
      
      // SEO fields
      meta_title: seoContent.metaTitle,
      meta_description: seoContent.metaDescription,
      search_keywords: seoContent.searchKeywords,
      page_title: seoContent.pageTitle,
      custom_url: {
        url: seoContent.urlSlug,
        is_customized: true
      },

      // Keep template pricing, categories, etc.
      // This preserves the business logic from the template
    }

    // Handle custom fields for tags
    if (processedTags.finalTags.length > 0) {
      newProductData.custom_fields = [
        ...(templateData.custom_fields || []),
        {
          name: 'Tags',
          value: processedTags.finalTags.join(', ')
        },
        {
          name: 'SEO Keywords',
          value: seoContent.searchKeywords
        },
        {
          name: 'Source',
          value: `Imported from Etsy: ${etsyData.url}`
        }
      ]
    }

    // Remove images if we're going to replace them
    if (options.replaceImages) {
      delete newProductData.images
    }

    return newProductData
  }

  private static async createProduct(productData: Omit<BigCommerceProduct, 'id'>): Promise<{
    success: boolean
    productId?: number
    error?: string
    warnings?: string[]
  }> {
    try {
      console.log(`🚀 Creating product with SKU: "${productData.sku}"`)
      console.log(`🚀 Product name: "${productData.name}"`)
      
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
      // Don't throw - images are not critical for product creation
    }
  }

  private static async copyModifiers(
    sourceProductId: number,
    targetProductId: number
  ): Promise<void> {
    try {
      // Fetch source product modifiers
      const response = await fetch(
        `${API_URL}/catalog/products/${sourceProductId}/modifiers`,
        { headers }
      )

      if (!response.ok) {
        console.warn('Could not fetch source product modifiers')
        return
      }

      const data = await response.json()
      const modifiers = data.data || []

      // Copy each modifier
      for (const modifier of modifiers) {
        try {
          // Remove ID and product-specific fields
          const { id, product_id, ...modifierData } = modifier

          const createResponse = await fetch(
            `${API_URL}/catalog/products/${targetProductId}/modifiers`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(modifierData)
            }
          )

          if (createResponse.ok) {
            console.log(`✅ Copied modifier: ${modifier.display_name}`)
          } else {
            console.warn(`⚠️ Failed to copy modifier: ${modifier.display_name}`)
          }

        } catch (error) {
          console.warn(`Error copying modifier ${modifier.display_name}:`, error)
        }
      }

    } catch (error) {
      console.error('Error copying modifiers:', error)
      // Don't throw - modifiers are not critical
    }
  }

  static async getTemplateProducts(): Promise<Array<{
    id: number
    name: string
    sku: string
    price: number
    categories: string[]
    hasModifiers: boolean
    imageCount: number
  }>> {
    try {
      console.log('📋 Fetching template products...')

      const response = await fetch(
        `${API_URL}/catalog/products?limit=250&include=images,modifiers`,
        {
          headers,
          cache: "no-store",
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }

      const data = await response.json()
      const products = data.data || []

      // Fetch categories for mapping
      const categoriesResponse = await fetch(`${API_URL}/catalog/categories?limit=250`, {
        headers,
        cache: "no-store",
      })

      const categoriesData = await categoriesResponse.json()
      const categories = categoriesData.data || []
      
      const categoryMapping: Record<number, string> = {}
      categories.forEach((cat: any) => {
        categoryMapping[cat.id] = cat.name
      })

      // Transform products for template selection
      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        categories: (product.categories || []).map((catId: number) => categoryMapping[catId] || 'Unknown'),
        hasModifiers: (product.modifiers || []).length > 0,
        imageCount: (product.images || []).length
      }))

    } catch (error) {
      console.error('Error fetching template products:', error)
      return []
    }
  }

  static validateProductData(productData: Omit<BigCommerceProduct, 'id'>): {
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