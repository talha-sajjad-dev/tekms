import puppeteer, { Browser, Page } from 'puppeteer'
import * as cheerio from 'cheerio'

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

export class EtsyScraper {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
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

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async scrapeProduct(url: string): Promise<EtsyScrapingResult> {
    if (!this.validateEtsyUrl(url)) {
      return {
        success: false,
        error: 'Invalid Etsy URL. Please provide a valid Etsy listing URL.'
      }
    }

    let browser: Browser | null = null

    try {
      console.log('🔍 Starting Etsy scraping for:', url)

      // Launch browser with advanced stealth settings
      browser = await puppeteer.launch({
        headless: true, // Use headless for production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-back-forward-cache',
          '--disable-ipc-flooding-protection',
          '--enable-features=NetworkService,NetworkServiceLogging',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--use-mock-keychain'
        ]
      })

      const page = await browser.newPage()

      // Advanced stealth techniques
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        })
        
        // Override the plugins property to use a custom getter
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        })
        
        // Override the languages property
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        })
        
        // Override chrome property
        Object.defineProperty(window, 'chrome', {
          get: () => ({
            runtime: {},
          }),
        })
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'default' } as any) :
            originalQuery(parameters)
        )
        
        // Mock screen properties
        Object.defineProperty(screen, 'width', { get: () => 1920 })
        Object.defineProperty(screen, 'height', { get: () => 1080 })
        Object.defineProperty(screen, 'availWidth', { get: () => 1920 })
        Object.defineProperty(screen, 'availHeight', { get: () => 1040 })
        Object.defineProperty(screen, 'colorDepth', { get: () => 24 })
        Object.defineProperty(screen, 'pixelDepth', { get: () => 24 })
      })

      // Set random user agent and viewport
      await page.setUserAgent(this.getRandomUserAgent())
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 100),
        height: 768 + Math.floor(Math.random() * 100)
      })

      // Set extra headers to appear more human-like
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      })

      // Navigate to the page with timeout
      console.log('📄 Loading page...')
      
      // Add random delay to simulate human behavior
      await this.delay(1000 + Math.random() * 2000)
      
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 60000
      })

      // Human-like waiting and interaction
      await this.delay(2000 + Math.random() * 3000) // Random delay 2-5 seconds

      // Simulate human scrolling
      await page.evaluate(() => {
        window.scrollTo(0, Math.floor(Math.random() * 500))
      })
      await this.delay(1000)

      // Try to wait for specific Etsy elements with multiple attempts
      let titleFound = false
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.waitForSelector('h1, [data-test-id="listing-page-title"], .listing-page-title', { timeout: 5000 })
          titleFound = true
          break
        } catch (error) {
          console.warn(`Attempt ${attempt + 1}: Could not find title selector, retrying...`)
          await this.delay(2000)
          
          // Try refreshing the page on second attempt
          if (attempt === 1) {
            console.log('🔄 Refreshing page...')
            await page.reload({ waitUntil: 'networkidle0' })
            await this.delay(3000)
          }
        }
      }

      if (!titleFound) {
        console.warn('⚠️ Title selector not found after 3 attempts')
      }

      // Additional wait for dynamic content
      await this.delay(2000)

      // Get page content
      const content = await page.content()
      const $ = cheerio.load(content)

      console.log('🔍 Extracting product data...')

      // Get page content for debugging
      const pageTitle = await page.title()
      console.log('📄 Page title:', pageTitle)
      
      // Check if we're blocked or redirected
      const currentUrl = page.url()
      console.log('📍 Current URL:', currentUrl)
      
      if (currentUrl.includes('captcha') || currentUrl.includes('blocked')) {
        throw new Error('Etsy has blocked the request. Please try again later or use a different approach.')
      }

      // Extract product data
      const productData = await this.extractProductData($, page)

      if (!productData.title) {
        // Save page content for debugging
        const pageContent = await page.content()
        console.log('📄 Page content length:', pageContent.length)
        console.log('📄 Page contains "listing":', pageContent.includes('listing'))
        console.log('📄 Page contains "product":', pageContent.includes('product'))
        
        // Try to extract any text that might be the title
        const allH1s = $('h1').map((_, el) => $(el).text().trim()).get()
        console.log('📄 All H1 elements found:', allH1s)
        
        throw new Error(`Could not extract product title. Page title: "${pageTitle}". Found ${allH1s.length} H1 elements. This might be due to Etsy's anti-bot protection.`)
      }

      console.log('✅ Successfully scraped product:', productData.title)

      return {
        success: true,
        data: {
          ...productData,
          url
        }
      }

    } catch (error) {
      console.error('❌ Scraping error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      }
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  private static async extractProductData($: cheerio.CheerioAPI, page: Page): Promise<Omit<EtsyProductData, 'url'>> {
    // Extract title
    const title = this.extractTitle($)
    
    // Extract description
    const description = this.extractDescription($)
    
    // Extract images
    const images = await this.extractImages($, page)
    
    // Extract tags
    const tags = this.extractTags($)
    
    // Extract materials
    const materials = this.extractMaterials($)
    
    // Extract category
    const category = this.extractCategory($)
    
    // Extract attributes
    const attributes = this.extractAttributes($)
    
    // Extract price
    const price = this.extractPrice($)
    
    // Extract shop name
    const shop = this.extractShop($)

    return {
      title,
      description,
      images,
      tags,
      materials,
      category,
      attributes,
      price,
      shop
    }
  }

  private static extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors for title
    const titleSelectors = [
      'h1[data-test-id="listing-page-title"]',
      'h1.listing-page-title',
      '[data-test-id="listing-page-title"]',
      '.listing-page-title',
      'h1[data-cy="listing-page-title"]',
      '.shop2-listing-page-title',
      '.listing-page-title h1',
      'h1:contains("listing")',
      'h1',
      '.product-title',
      '[data-testid="listing-page-title"]'
    ]

    for (const selector of titleSelectors) {
      try {
        const title = $(selector).first().text().trim()
        if (title && title.length > 5) { // Ensure it's a meaningful title
          console.log(`✅ Found title with selector: ${selector}`)
          return title
        }
      } catch (error) {
        continue
      }
    }

    // Fallback: try to extract from page title or meta tags
    const pageTitle = $('title').text().trim()
    if (pageTitle && !pageTitle.toLowerCase().includes('etsy')) {
      const cleanTitle = pageTitle.replace(/\s*\|\s*Etsy.*$/i, '').trim()
      if (cleanTitle.length > 5) {
        console.log('✅ Extracted title from page title')
        return cleanTitle
      }
    }

    // Try meta property
    const metaTitle = $('meta[property="og:title"]').attr('content')
    if (metaTitle && metaTitle.length > 5) {
      console.log('✅ Extracted title from meta tag')
      return metaTitle.trim()
    }

    console.warn('❌ Could not extract product title')
    return ''
  }

  private static extractDescription($: cheerio.CheerioAPI): string {
    // Try multiple selectors for description
    const descSelectors = [
      '[data-test-id="listing-page-description"]',
      '.listing-page-description',
      '.shop2-listing-description',
      '.listing-description',
      '#description-text',
      '[data-cy="listing-page-description"]',
      '.product-description',
      '.listing-page-description-text',
      '.description-text',
      '[data-testid="listing-page-description"]'
    ]

    for (const selector of descSelectors) {
      try {
        const desc = $(selector).first().text().trim()
        if (desc && desc.length > 20) { // Ensure it's a meaningful description
          console.log(`✅ Found description with selector: ${selector}`)
          return desc
        }
      } catch (error) {
        continue
      }
    }

    // Fallback: try to extract from meta description
    const metaDesc = $('meta[name="description"]').attr('content')
    if (metaDesc && metaDesc.length > 20) {
      console.log('✅ Extracted description from meta tag')
      return metaDesc.trim()
    }

    // Try og:description
    const ogDesc = $('meta[property="og:description"]').attr('content')
    if (ogDesc && ogDesc.length > 20) {
      console.log('✅ Extracted description from og:description')
      return ogDesc.trim()
    }

    console.warn('❌ Could not extract product description')
    return 'No description available'
  }

  private static async extractImages($: cheerio.CheerioAPI, page: Page): Promise<string[]> {
    const images: string[] = []

    try {
      // Wait for images to load
      await page.waitForSelector('img', { timeout: 5000 })

      // Extract image URLs
      const imageElements = await page.$$eval('img', (imgs: HTMLImageElement[]) => {
        return imgs
          .map((img: HTMLImageElement) => img.src || img.getAttribute('data-src'))
          .filter((src: string | null): src is string => src !== null && src.includes('etsystatic.com'))
          .filter((src: string) => !src.includes('avatar') && !src.includes('icon'))
      })

      // Get high-resolution versions
      for (const src of imageElements) {
        if (src) {
          // Convert to high-res version
          const highResSrc = src.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
                               .replace(/\/il_\d+x\d+_/g, '/il_fullxfull_')
          images.push(highResSrc)
        }
      }

      // Remove duplicates
      return [...new Set(images)].slice(0, 10) // Limit to 10 images

    } catch (error) {
      console.warn('Could not extract images:', error)
      return []
    }
  }

  private static extractTags($: cheerio.CheerioAPI): string[] {
    const tags: string[] = []

    // Try to find tags in various locations
    const tagSelectors = [
      '[data-test-id="listing-tag"]',
      '.listing-tag',
      '.shop2-listing-tag',
      '.tag'
    ]

    for (const selector of tagSelectors) {
      $(selector).each((_, el) => {
        const tag = $(el).text().trim()
        if (tag) tags.push(tag)
      })
    }

    // Also look for tags in meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content')
    if (metaKeywords) {
      const keywordTags = metaKeywords.split(',').map(tag => tag.trim())
      tags.push(...keywordTags)
    }

    return [...new Set(tags)].filter(tag => tag.length > 0)
  }

  private static extractMaterials($: cheerio.CheerioAPI): string[] {
    const materials: string[] = []

    // Look for materials section
    const materialSelectors = [
      '[data-test-id="listing-materials"]',
      '.listing-materials',
      '.materials'
    ]

    for (const selector of materialSelectors) {
      $(selector).find('span, div, p').each((_, el) => {
        const material = $(el).text().trim()
        if (material) materials.push(material)
      })
    }

    return [...new Set(materials)].filter(material => material.length > 0)
  }

  private static extractCategory($: cheerio.CheerioAPI): string {
    // Try to find category in breadcrumbs
    const breadcrumbSelectors = [
      '[data-test-id="breadcrumb"]',
      '.breadcrumb',
      '.shop2-breadcrumb'
    ]

    for (const selector of breadcrumbSelectors) {
      const breadcrumbs = $(selector).find('a').map((_, el) => $(el).text().trim()).get()
      if (breadcrumbs.length > 0) {
        return breadcrumbs[breadcrumbs.length - 1] || 'General'
      }
    }

    return 'General'
  }

  private static extractAttributes($: cheerio.CheerioAPI): Record<string, string> {
    const attributes: Record<string, string> = {}

    // Look for attribute sections
    $('[data-test-id*="attribute"], .listing-attribute, .shop2-listing-attribute').each((_, el) => {
      const label = $(el).find('.label, .attribute-label').text().trim()
      const value = $(el).find('.value, .attribute-value').text().trim()
      
      if (label && value) {
        attributes[label] = value
      }
    })

    return attributes
  }

  private static extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceSelectors = [
      '[data-test-id="listing-price"]',
      '.listing-price',
      '.currency-value'
    ]

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim()
      const priceMatch = priceText.match(/[\d,]+\.?\d*/g)
      
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/,/g, ''))
        if (!isNaN(price)) return price
      }
    }

    return undefined
  }

  private static extractShop($: cheerio.CheerioAPI): string {
    const shopSelectors = [
      '[data-test-id="shop-name"]',
      '.shop-name',
      '.shop2-shop-name'
    ]

    for (const selector of shopSelectors) {
      const shop = $(selector).first().text().trim()
      if (shop) return shop
    }

    return 'Unknown Shop'
  }
}