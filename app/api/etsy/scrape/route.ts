import { NextRequest, NextResponse } from 'next/server'
import { EtsyHttpScraper } from '@/lib/etsy/http-scraper'
import { SEOOptimizer } from '@/lib/seo/optimizer'

export interface ScrapeRequest {
  url: string
  options?: {
    includeImages: boolean
    includeTags: boolean
    includeMaterials: boolean
    generateSEO: boolean
  }
}

export interface ScrapeResponse {
  success: boolean
  data?: any
  seoAnalysis?: any
  error?: string
  processingTime?: number
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Starting Etsy scraping request...')
    
    const body: ScrapeRequest = await request.json()
    const { url, options = {} } = body

    // Validate request
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'Etsy URL is required'
      }, { status: 400 })
    }

    // Set default options
    const scrapeOptions = {
      includeImages: true,
      includeTags: true,
      includeMaterials: true,
      generateSEO: true,
      ...options
    }

    console.log('📄 Scraping Etsy product:', url)

    // Scrape the Etsy product
    const scrapeResult = await EtsyHttpScraper.scrapeProduct(url)

    if (!scrapeResult.success || !scrapeResult.data) {
      return NextResponse.json({
        success: false,
        error: scrapeResult.error || 'Failed to scrape Etsy product'
      }, { status: 400 })
    }

    const etsyData = scrapeResult.data

    console.log(`📸 Scraped ${etsyData.images?.length || 0} images from Etsy`)
    console.log('Images:', etsyData.images)

    // Filter data based on options
    if (!scrapeOptions.includeImages) {
      etsyData.images = []
    }
    if (!scrapeOptions.includeTags) {
      etsyData.tags = []
    }
    if (!scrapeOptions.includeMaterials) {
      etsyData.materials = []
    }

    let seoAnalysis = null

    // Generate SEO analysis if requested
    if (scrapeOptions.generateSEO) {
      console.log('🚀 Generating SEO analysis...')
      try {
        seoAnalysis = await SEOOptimizer.optimizeProduct(etsyData)
      } catch (seoError) {
        console.warn('SEO analysis failed:', seoError)
        // Continue without SEO analysis
      }
    }

    const processingTime = Date.now() - startTime

    console.log(`✅ Scraping completed in ${processingTime}ms`)
    console.log(`📤 Returning ${etsyData.images?.length || 0} images to frontend`)

    return NextResponse.json({
      success: true,
      data: etsyData,
      seoAnalysis,
      processingTime,
      imageCount: etsyData.images?.length || 0  // Add image count to response
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ Scraping failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime
    }, { status: 500 })
  }
}

// GET endpoint for testing/health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Etsy scraping service is running',
    endpoints: {
      scrape: 'POST /api/etsy/scrape',
      import: 'POST /api/etsy/import'
    },
    supportedSites: ['etsy.com'],
    features: [
      'Product title extraction',
      'Description extraction', 
      'Image extraction',
      'Tag extraction',
      'Material extraction',
      'SEO optimization',
      'Keyword analysis'
    ]
  })
}