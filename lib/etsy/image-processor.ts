// Using built-in fetch (Node.js 18+)

export interface ImageProcessingResult {
  success: boolean
  bigcommerceImageId?: number
  url?: string
  altText: string
  error?: string
}

export interface ImageUploadOptions {
  productId: number
  imageUrl: string
  altText: string
  description?: string
  isThumbnail?: boolean
  sortOrder?: number
}

export class ImageProcessor {
  private static readonly BIGCOMMERCE_API_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH || "t48lqqxd8a"}/v3`
  private static readonly HEADERS = {
    'Content-Type': 'application/json',
    'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN || "mj7iz6x9io2hx9o43zifx4zv3s7ewrx",
    'Accept': 'application/json'
  }

  private static readonly MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB
  private static readonly SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  private static readonly TIMEOUT = 30000 // 30 seconds

  static async processAndUploadImages(
    productId: number,
    imageUrls: string[],
    altTexts: string[] = []
  ): Promise<ImageProcessingResult[]> {
    console.log(`🖼️ Processing ${imageUrls.length} images for product ${productId}`)

    const results: ImageProcessingResult[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const altText = altTexts[i] || `Product Image ${i + 1}`
      
      console.log(`📸 Processing image ${i + 1}/${imageUrls.length}: ${imageUrl}`)

      try {
        // Validate image URL
        if (!this.isValidImageUrl(imageUrl)) {
          results.push({
            success: false,
            altText,
            error: 'Invalid image URL format'
          })
          continue
        }

        // Download and validate image
        const imageData = await this.downloadImage(imageUrl)
        if (!imageData.success) {
          results.push({
            success: false,
            altText,
            error: imageData.error || 'Failed to download image'
          })
          continue
        }

        // Upload to BigCommerce
        const uploadResult = await this.uploadToBigCommerce({
          productId,
          imageUrl,
          altText,
          description: `Product image ${i + 1}`,
          isThumbnail: i === 0, // First image as thumbnail
          sortOrder: i
        })

        results.push(uploadResult)

        // Rate limiting - wait between uploads
        if (i < imageUrls.length - 1) {
          await this.delay(1000) // 1 second delay
        }

      } catch (error) {
        console.error(`❌ Error processing image ${i + 1}:`, error)
        results.push({
          success: false,
          altText,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ Successfully processed ${successCount}/${imageUrls.length} images`)

    return results
  }

  private static async downloadImage(url: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      console.log(`⬇️ Downloading image: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.startsWith('image/')) {
        return {
          success: false,
          error: 'URL does not point to an image'
        }
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > this.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: 'Image is too large (max 8MB)'
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      if (buffer.length > this.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: 'Image is too large (max 8MB)'
        }
      }

      console.log(`✅ Downloaded image: ${(buffer.length / 1024).toFixed(1)}KB`)

      return {
        success: true,
        data: buffer
      }

    } catch (error) {
      console.error('Download error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      }
    }
  }

  private static async uploadToBigCommerce(options: ImageUploadOptions): Promise<ImageProcessingResult> {
    try {
      console.log(`⬆️ Uploading image to BigCommerce for product ${options.productId}`)

      const imageData = {
        image_url: options.imageUrl,
        is_thumbnail: options.isThumbnail || false,
        sort_order: options.sortOrder || 0,
        description: options.description || options.altText
      }

      const response = await fetch(
        `${this.BIGCOMMERCE_API_URL}/catalog/products/${options.productId}/images`,
        {
          method: 'POST',
          headers: this.HEADERS,
          body: JSON.stringify(imageData)
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`BigCommerce API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      
      console.log(`✅ Image uploaded successfully: ID ${result.data?.id}`)

      return {
        success: true,
        bigcommerceImageId: result.data?.id,
        url: result.data?.url_standard || options.imageUrl,
        altText: options.altText
      }

    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        altText: options.altText,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  private static isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false
      }

      // Check if it has a valid image extension
      const pathname = urlObj.pathname.toLowerCase()
      const hasValidExtension = this.SUPPORTED_FORMATS.some(format => 
        pathname.includes(`.${format}`)
      )

      // For Etsy images, they might not have extensions in the URL
      // but should contain 'etsystatic.com'
      const isEtsyImage = url.includes('etsystatic.com')

      return hasValidExtension || isEtsyImage

    } catch {
      return false
    }
  }

  static optimizeImageUrl(url: string): string {
    // Optimize Etsy image URLs for highest quality
    if (url.includes('etsystatic.com')) {
      // Convert to full resolution
      return url
        .replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
        .replace(/\/il_\d+x\d+_/g, '/il_fullxfull_')
        .replace(/\/s\d+x\d+\//g, '/s2048x2048/') // Use high resolution
    }

    return url
  }

  static generateImageAltText(productTitle: string, imageIndex: number, keywords: string[] = []): string {
    const baseAlt = productTitle

    if (imageIndex === 0) {
      return `${baseAlt} - Main Product Image`
    }

    const descriptors = [
      'Detail View',
      'Close-up',
      'Side View',
      'Back View',
      'Texture Detail',
      'Design Pattern',
      'Additional Angle'
    ]

    const descriptor = descriptors[Math.min(imageIndex - 1, descriptors.length - 1)]
    
    // Add keyword if available
    const keyword = keywords[Math.min(imageIndex - 1, keywords.length - 1)]
    if (keyword) {
      return `${baseAlt} - ${keyword} ${descriptor}`
    }

    return `${baseAlt} - ${descriptor}`
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async deleteProductImages(productId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting existing images for product ${productId}`)

      // Get existing images
      const response = await fetch(
        `${this.BIGCOMMERCE_API_URL}/catalog/products/${productId}/images`,
        {
          headers: this.HEADERS
        }
      )

      if (!response.ok) {
        console.warn('Could not fetch existing images')
        return false
      }

      const data = await response.json()
      const images = data.data || []

      // Delete each image
      for (const image of images) {
        try {
          await fetch(
            `${this.BIGCOMMERCE_API_URL}/catalog/products/${productId}/images/${image.id}`,
            {
              method: 'DELETE',
              headers: this.HEADERS
            }
          )
          console.log(`✅ Deleted image ${image.id}`)
        } catch (error) {
          console.warn(`Failed to delete image ${image.id}:`, error)
        }
      }

      return true

    } catch (error) {
      console.error('Error deleting images:', error)
      return false
    }
  }

  static validateImageResults(results: ImageProcessingResult[]): {
    valid: boolean
    successCount: number
    errorCount: number
    errors: string[]
  } {
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error')

    return {
      valid: successCount > 0, // At least one image should succeed
      successCount,
      errorCount,
      errors
    }
  }
}