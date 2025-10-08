export interface TikTokProduct {
  'Product Title': string
  'Description': string
  'Price': number
  'Compare at Price'?: number
  'SKU': string
  'Barcode'?: string
  'Weight': number
  'Weight Unit': string
  'Image 1'?: string
  'Image 2'?: string
  'Image 3'?: string
  'Image 4'?: string
  'Image 5'?: string
  'Image 6'?: string
  'Image 7'?: string
  'Image 8'?: string
  'Image 9'?: string
  'Category': string
  'Brand': string
  'Variant Name'?: string
  'Option1 Name'?: string
  'Option1 Value'?: string
  'Option2 Name'?: string
  'Option2 Value'?: string
  'Option3 Name'?: string
  'Option3 Value'?: string
  'Quantity': number
  'Status': 'active' | 'draft'
  'BB'?: string // Always "No"
  'BD'?: string // BC Product Status
  'BE'?: string // Safety optional title
  [key: string]: any // Allow additional fields
}

export interface BigCommerceProduct {
  id: number
  name: string
  description: string
  price: number
  sale_price?: number
  sku: string
  upc?: string
  weight: number
  images?: Array<{
    url_standard: string
    url_zoom?: string
    url_thumbnail?: string
    url_original?: string
    is_thumbnail: boolean
  }>
  categories?: number[]
  brand_name?: string
  inventory_level?: number
  is_visible?: boolean
  modifiers?: Array<{
    display_name: string
    option_values?: Array<{
      label: string
      value_data?: {
        price_adjustment?: number
      }
    }>
  }>
}

/**
 * Map BigCommerce product to TikTok format
 */
export function mapProductToTikTok(
  product: BigCommerceProduct,
  categoryName: string = 'General'
): TikTokProduct {
  // Extract images - prioritize larger images over thumbnails
  const images = product.images || []
  const sortedImages = images.sort((a, b) => {
    // Prioritize non-thumbnails first, then thumbnails
    if (!a.is_thumbnail && b.is_thumbnail) return -1
    if (a.is_thumbnail && !b.is_thumbnail) return 1
    return 0
  })

  // Base product mapping
  const tiktokProduct: TikTokProduct = {
    'Product Title': product.name,
    'Description': cleanDescription(product.description || ''),
    'Price': product.sale_price || product.price,
    'Compare at Price': product.sale_price ? product.price : undefined,
    'SKU': product.sku,
    'Barcode': product.upc,
    'Weight': product.weight || 0,
    'Weight Unit': 'lb', // Default to pounds
    'Category': categoryName,
    'Brand': product.brand_name || 'Unbranded',
    'Quantity': product.inventory_level || 0,
    'Status': product.is_visible ? 'active' : 'draft',
    'BB': 'No', // Always "No" for each row
    'BD': product.is_visible ? 'active' : 'draft', // BC Product Status
    'BE': '', // Safety optional title (empty by default)
    productId: product.id // Include BigCommerce product ID
  }

  // Map all available images using the largest size available
  sortedImages.forEach((image, index) => {
    // Use url_original (largest) if available, then url_zoom, then url_standard, then fallback to url_thumbnail
    let imageUrl = image.url_original || image.url_zoom || image.url_standard || image.url_thumbnail || image.url_standard
    
    // Remove query parameters like ?c=1 to get clean image URLs
    if (imageUrl) {
      imageUrl = imageUrl.split('?')[0]
    }
    
    tiktokProduct[`Image ${index + 1}`] = imageUrl
  })

  return tiktokProduct
}

/**
 * Map products with variants (modifiers) to TikTok format
 * Each variant combination becomes a separate row
 */
export function mapProductWithVariants(
  product: BigCommerceProduct,
  categoryName: string = 'General'
): TikTokProduct[] {
  const baseProduct = mapProductToTikTok(product, categoryName)
  
  // If no modifiers, return single product
  if (!product.modifiers || product.modifiers.length === 0) {
    return [baseProduct]
  }

  // Extract modifiers that have options (dropdowns, radio buttons, etc.)
  const variantModifiers = product.modifiers.filter(
    mod => mod.option_values && mod.option_values.length > 0
  )

  if (variantModifiers.length === 0) {
    return [baseProduct]
  }

  // Generate all variant combinations
  const variants: TikTokProduct[] = []
  const combinations = generateCombinations(variantModifiers)

  combinations.forEach((combination, index) => {
    const variant = { ...baseProduct }
    
    // Create variant SKU
    const variantSuffix = combination.map((opt: any) => opt.value).join('-')
    variant['SKU'] = `${product.sku}-${variantSuffix}`
    
    // Set variant name
    variant['Variant Name'] = combination.map((opt: any) => opt.value).join(' / ')
    
    // Map options (up to 3)
    combination.slice(0, 3).forEach((option: any, optIndex: number) => {
      variant[`Option${optIndex + 1} Name`] = option.modifierName
      variant[`Option${optIndex + 1} Value`] = option.value
      
      // Adjust price if there's a price adjustment
      if (option.priceAdjustment) {
        variant['Price'] = (baseProduct['Price'] || 0) + option.priceAdjustment
      }
    })

    variants.push(variant)
  })

  return variants
}

/**
 * Generate all combinations of modifier options (with safety limits)
 */
function generateCombinations(modifiers: any[]): any[] {
  if (modifiers.length === 0) return []
  
  // Safety check - limit to reasonable number of combinations
  const totalCombinations = modifiers.reduce((total, mod) => {
    return total * (mod.option_values?.length || 1)
  }, 1)
  
  // If too many combinations, just use the first modifier or limit combinations
  if (totalCombinations > 50) {
    console.warn(`Too many combinations (${totalCombinations}), limiting to first modifier only`)
    const firstModifier = modifiers[0]
    return firstModifier.option_values?.map((option: any) => [{
      modifierName: firstModifier.display_name,
      value: option.label,
      priceAdjustment: option.value_data?.price_adjustment || 0
    }]) || []
  }
  
  const combinations: any[] = []
  
  function generate(index: number, current: any[]) {
    if (index === modifiers.length) {
      combinations.push([...current])
      return
    }
    
    const modifier = modifiers[index]
    modifier.option_values.forEach((option: any) => {
      current.push({
        modifierName: modifier.display_name,
        value: option.label,
        priceAdjustment: option.value_data?.price_adjustment || 0
      })
      generate(index + 1, current)
      current.pop()
    })
  }
  
  generate(0, [])
  return combinations
}

/**
 * Clean HTML from description
 */
function cleanDescription(description: string): string {
  // Remove HTML tags
  let cleaned = description.replace(/<[^>]*>/g, '')
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // Limit length (TikTok has character limits)
  if (cleaned.length > 2000) {
    cleaned = cleaned.substring(0, 1997) + '...'
  }
  
  return cleaned
}

/**
 * Validate TikTok product data
 */
export function validateTikTokProduct(product: TikTokProduct): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Required fields
  if (!product['Product Title']) errors.push('Product Title is required')
  if (!product['Description']) errors.push('Description is required')
  if (!product['Price'] || product['Price'] <= 0) errors.push('Price must be greater than 0')
  if (!product['SKU']) errors.push('SKU is required')
  if (!product['Category']) errors.push('Category is required')
  
  // At least one image
  if (!product['Image 1']) errors.push('At least one image is required')
  
  // Weight validation
  if (product['Weight'] < 0) errors.push('Weight cannot be negative')
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Batch process products for TikTok export
 */
export function batchProcessProducts(
  products: BigCommerceProduct[],
  categoryMapping: Record<number, string> = {}
): TikTokProduct[] {
  const allTikTokProducts: TikTokProduct[] = []
  
  products.forEach(product => {
    // Get category name from mapping
    const categoryId = product.categories?.[0]
    const categoryName = categoryId ? categoryMapping[categoryId] || 'General' : 'General'
    
    // Process product with variants
    const tiktokProducts = mapProductWithVariants(product, categoryName)
    allTikTokProducts.push(...tiktokProducts)
  })
  
  return allTikTokProducts
}