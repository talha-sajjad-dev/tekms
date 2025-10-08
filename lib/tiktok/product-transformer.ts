/**
 * Transform BigCommerce products to TikTok Shop format
 */

interface BigCommerceProduct {
  id: number
  name: string
  description: string
  price: number
  sku: string
  weight?: number
  images?: Array<{ url_standard: string }>
  variants?: any[]
  inventory_level?: number
  is_visible?: boolean
}

interface TikTokProduct {
  product_name: string
  description: string
  category_id: string
  brand_id?: string
  main_images: Array<{ url: string }>
  skus: Array<{
    seller_sku: string
    price: {
      amount: string
      currency: string
    }
    inventory: Array<{
      warehouse_id: string
      quantity: number
    }>
  }>
}

/**
 * Transform BigCommerce product to TikTok format
 */
export function transformProduct(bcProduct: BigCommerceProduct, options: {
  categoryId: string
  warehouseId: string
  brandId?: string
}): TikTokProduct {
  // Extract main images
  const mainImages = (bcProduct.images || []).slice(0, 9).map(img => ({
    url: img.url_standard
  }))

  // Create SKU data
  const skus = [{
    seller_sku: bcProduct.sku || `BC-${bcProduct.id}`,
    price: {
      amount: (bcProduct.price * 100).toString(), // TikTok expects price in cents
      currency: 'USD'
    },
    inventory: [{
      warehouse_id: options.warehouseId,
      quantity: bcProduct.inventory_level || 0
    }]
  }]

  // Build TikTok product
  return {
    product_name: bcProduct.name.substring(0, 255), // TikTok has 255 char limit
    description: stripHtml(bcProduct.description || '').substring(0, 5000),
    category_id: options.categoryId,
    brand_id: options.brandId,
    main_images: mainImages,
    skus: skus
  }
}

/**
 * Strip HTML tags from description
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Batch transform products
 */
export function transformProducts(
  bcProducts: BigCommerceProduct[],
  options: {
    categoryId: string
    warehouseId: string
    brandId?: string
  }
): TikTokProduct[] {
  return bcProducts.map(product => transformProduct(product, options))
}