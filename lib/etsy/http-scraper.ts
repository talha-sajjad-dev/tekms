export interface EtsyProductData {
  title: string
  description: string
  images: string[]
  tags: string[]
  materials: string[]
  category: string
  attributes: Record<string, string>
  price?: number
  shop: string
  url: string
}

export interface EtsyScrapingResult {
  success: boolean
  data?: EtsyProductData
  error?: string
}

export class EtsyHttpScraper {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ]

  private static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)]
  }

  private static validateEtsyUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('etsy.com') && url.includes('/listing/')
    } catch {
      return false
    }
  }

  static async scrapeProduct(url: string): Promise<EtsyScrapingResult> {
    if (!this.validateEtsyUrl(url)) {
      return {
        success: false,
        error: 'Invalid Etsy URL. Please provide a valid Etsy listing URL.'
      }
    }

    try {
      console.log('🔍 Starting HTTP scraping for:', url)

      // Try multiple approaches to bypass restrictions
      let response: Response
      let html: string

      // Approach 1: Direct request with enhanced headers
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Referer': 'https://www.google.com/',
            'Origin': 'https://www.google.com'
          }
        })

        if (response.ok) {
          html = await response.text()
        } else {
          throw new Error(`Direct request failed: ${response.status}`)
        }
      } catch (directError) {
        console.log('Direct request failed, trying alternative approach...')
        
        // Approach 2: Use a public CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        
        try {
          response = await fetch(proxyUrl, {
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'Accept': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`Proxy request failed: ${response.status}`)
          }

          const proxyData = await response.json()
          html = proxyData.contents

          if (!html || html.length < 1000) {
            throw new Error('Proxy returned insufficient data')
          }
        } catch (proxyError) {
          console.log('Proxy approach failed, trying final method...')
          
          // Approach 3: Try different proxy
          const altProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`
          
          response = await fetch(altProxyUrl, {
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'X-Requested-With': 'XMLHttpRequest'
            }
          })

          if (!response.ok) {
            throw new Error(`All methods failed. Last error: HTTP ${response.status}: ${response.statusText}`)
          }

          html = await response.text()
        }
      }

      // html variable already declared above
      console.log('📄 Page content length:', html.length)

      // Extract data using regex patterns (like Google Sheets would)
      const productData = this.extractDataFromHtml(html, url)

      if (!productData.title) {
        throw new Error('Could not extract product title from the page content.')
      }

      console.log('✅ Successfully scraped product:', productData.title)

      return {
        success: true,
        data: productData
      }

    } catch (error) {
      console.error('❌ HTTP scraping error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      }
    }
  }

  private static extractDataFromHtml(html: string, url: string): EtsyProductData {
    // Extract title using multiple patterns
    const title = this.extractTitle(html)
    
    // Extract description
    const description = this.extractDescription(html)
    
    // Extract images
    const images = this.extractImages(html)
    
    // Extract tags
    const tags = this.extractTags(html)
    
    // Extract materials
    const materials = this.extractMaterials(html)
    
    // Extract category
    const category = this.extractCategory(html)
    
    // Extract shop name
    const shop = this.extractShop(html)
    
    // Extract price
    const price = this.extractPrice(html)

    return {
      title,
      description,
      images,
      tags,
      materials,
      category,
      attributes: {},
      price,
      shop,
      url
    }
  }

  private static extractTitle(html: string): string {
    // Try multiple patterns for title extraction
    const patterns = [
      /<title[^>]*>([^<]+)/i,
      /"title":"([^"]+)"/i,
      /"name":"([^"]+)"/i,
      /property="og:title"[^>]*content="([^"]+)"/i,
      /name="twitter:title"[^>]*content="([^"]+)"/i,
      /<h1[^>]*>([^<]+)<\/h1>/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        let title = match[1].trim()
        
        // Clean up title
        title = title.replace(/\s*\|\s*Etsy.*$/i, '')
        title = title.replace(/&quot;/g, '"')
        title = title.replace(/&amp;/g, '&')
        title = title.replace(/&lt;/g, '<')
        title = title.replace(/&gt;/g, '>')
        title = title.replace(/&#39;/g, "'")
        
        if (title.length > 5 && !title.toLowerCase().includes('etsy')) {
          console.log('✅ Found title with pattern:', pattern.source)
          return title
        }
      }
    }

    console.warn('❌ Could not extract title')
    return ''
  }

  private static extractDescription(html: string): string {
    // Try multiple patterns for description
    const patterns = [
      /"description":"([^"]+)"/i,
      /property="og:description"[^>]*content="([^"]+)"/i,
      /name="description"[^>]*content="([^"]+)"/i,
      /name="twitter:description"[^>]*content="([^"]+)"/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        let description = match[1].trim()
        
        // Clean up description
        description = description.replace(/\\n/g, '\n')
        description = description.replace(/\\"/g, '"')
        description = description.replace(/&quot;/g, '"')
        description = description.replace(/&amp;/g, '&')
        description = description.replace(/&lt;/g, '<')
        description = description.replace(/&gt;/g, '>')
        description = description.replace(/&#39;/g, "'")
        
        if (description.length > 20) {
          console.log('✅ Found description with pattern:', pattern.source)
          return description
        }
      }
    }

    console.warn('❌ Could not extract description')
    return 'No description available'
  }

  private static extractImages(html: string): string[] {
    console.log('🔍 Starting smart image extraction...')
    
    // Extract ALL Etsy image URLs
    const etsyImagePattern = /https?:\/\/i\.etsystatic\.com\/(\d+)\/[^"'\s]+\/(il_\d+x[^"'\s]+\.\d+_[^"'\s]+\.(jpg|jpeg|png|webp))/gi
    
    // Map to count how many times each unique image ID appears
    const imageIdCount = new Map<string, { urls: string[], shopId: string }>()
    let match
    
    while ((match = etsyImagePattern.exec(html)) !== null) {
      const shopId = match[1]  // e.g., "35917774"
      let imageUrl = match[0]
      
      // Clean up escaping
      imageUrl = imageUrl.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\/g, '')
      
      // Extract unique image ID (the number before the hash, e.g., "6925800055" from "6925800055_2woo.jpg")
      const imageIdMatch = imageUrl.match(/\.(\d+)_[^.]+\.(jpg|jpeg|png|webp)/i)
      if (imageIdMatch) {
        const imageId = imageIdMatch[1]
        
        if (!imageIdCount.has(imageId)) {
          imageIdCount.set(imageId, { urls: [], shopId })
        }
        imageIdCount.get(imageId)!.urls.push(imageUrl)
      }
    }
    
    console.log(`📸 Found ${imageIdCount.size} unique image IDs`)
    
    // Product listing images appear in multiple sizes (3+ times)
    // Related/suggested items appear only once
    const productImages: string[] = []
    let primaryShopId = ''
    
    // First, find the shop ID from the most common images (the actual product)
    for (const [imageId, data] of imageIdCount.entries()) {
      if (data.urls.length >= 2) { // Product images appear in at least 2 different sizes
        primaryShopId = data.shopId
        break
      }
    }
    
    console.log(`🏪 Primary shop ID: ${primaryShopId}`)
    
    // Now extract only images from the primary shop that appear multiple times
    for (const [imageId, data] of imageIdCount.entries()) {
      if (data.shopId === primaryShopId && data.urls.length >= 2) {
        // Take the largest version (convert to fullxfull)
        let imageUrl = data.urls[0]
        imageUrl = imageUrl.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
        imageUrl = imageUrl.replace(/\/il_\d+x\d+_/g, '/il_fullxfull_')
        
        productImages.push(imageUrl)
        console.log(`  ✓ Product image ${productImages.length}: ID ${imageId} (appears ${data.urls.length}x)`)
      }
    }
    
    // Fallback: If no multi-appearance images, just take first few from primary shop
    if (productImages.length === 0 && primaryShopId) {
      console.log('⚠️ No multi-appearance images, using first few from primary shop')
      for (const [imageId, data] of imageIdCount.entries()) {
        if (data.shopId === primaryShopId) {
          let imageUrl = data.urls[0]
          imageUrl = imageUrl.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
          imageUrl = imageUrl.replace(/\/il_\d+x\d+_/g, '/il_fullxfull_')
          productImages.push(imageUrl)
          if (productImages.length >= 5) break
        }
      }
    }
    
    // Last resort: og:image
    if (productImages.length === 0) {
      console.log('🔍 Last resort: og:image')
      const ogPattern = /property="og:image"[^>]*content="([^"]+)"/i
      const ogMatch = html.match(ogPattern)
      if (ogMatch) {
        let imageUrl = ogMatch[1]
        imageUrl = imageUrl.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
        productImages.push(imageUrl)
      }
    }
    
    console.log(`✅ FINAL: ${productImages.length} actual product images`)
    productImages.forEach((url, i) => console.log(`   ${i + 1}. ${url}`))
    
    return productImages.slice(0, 10)
  }

  private static extractTags(html: string): string[] {
    const tags: string[] = []
    
    // Extract tags from JSON data
    const patterns = [
      /"tags":\s*\[([^\]]+)\]/i,
      /"keywords":"([^"]+)"/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        if (pattern.source.includes('tags')) {
          // Parse JSON array
          try {
            const tagArray = JSON.parse(`[${match[1]}]`)
            tags.push(...tagArray.map((tag: string) => tag.replace(/"/g, '')))
          } catch (error) {
            // Fallback: split by comma
            const tagList = match[1].split(',').map(tag => tag.replace(/["\s]/g, ''))
            tags.push(...tagList)
          }
        } else {
          // Split keywords by comma
          const keywordTags = match[1].split(',').map(tag => tag.trim())
          tags.push(...keywordTags)
        }
      }
    }

    console.log(`✅ Found ${tags.length} tags`)
    return [...new Set(tags)].filter(tag => tag.length > 0)
  }

  private static extractMaterials(html: string): string[] {
    const materials: string[] = []
    
    // Look for materials in various places
    const patterns = [
      /"materials":\s*\[([^\]]+)\]/i,
      /"material":"([^"]+)"/gi
    ]

    for (const pattern of patterns) {
      if (pattern.global) {
        let match
        while ((match = pattern.exec(html)) !== null) {
          materials.push(match[1].replace(/"/g, ''))
        }
      } else {
        const match = html.match(pattern)
        if (match && match[1]) {
          try {
            const materialArray = JSON.parse(`[${match[1]}]`)
            materials.push(...materialArray.map((material: string) => material.replace(/"/g, '')))
          } catch (error) {
            const materialList = match[1].split(',').map(material => material.replace(/["\s]/g, ''))
            materials.push(...materialList)
          }
        }
      }
    }

    console.log(`✅ Found ${materials.length} materials`)
    return [...new Set(materials)].filter(material => material.length > 0)
  }

  private static extractCategory(html: string): string {
    // Extract category from breadcrumbs or metadata
    const patterns = [
      /"category":"([^"]+)"/i,
      /"breadcrumbs"[^}]*"name":"([^"]+)"/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const category = match[1].trim()
        if (category.length > 0 && !category.toLowerCase().includes('etsy')) {
          console.log('✅ Found category:', category)
          return category
        }
      }
    }

    return 'General'
  }

  private static extractShop(html: string): string {
    // Extract shop name
    const patterns = [
      /"shop_name":"([^"]+)"/i,
      /"seller":"([^"]+)"/i,
      /by\s+([^<]+)\s+on\s+Etsy/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const shop = match[1].trim()
        if (shop.length > 0) {
          console.log('✅ Found shop:', shop)
          return shop
        }
      }
    }

    return 'Unknown Shop'
  }

  private static extractPrice(html: string): number | undefined {
    // Extract price
    const patterns = [
      /"price":\s*"?([0-9.]+)"?/i,
      /"amount":\s*"?([0-9.]+)"?/i,
      /\$([0-9.]+)/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const price = parseFloat(match[1])
        if (!isNaN(price) && price > 0) {
          console.log('✅ Found price:', price)
          return price
        }
      }
    }

    return undefined
  }
}