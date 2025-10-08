import { NextRequest, NextResponse } from 'next/server'
import { EtsyHttpScraper } from '@/lib/etsy/http-scraper'
import { SEOOptimizer } from '@/lib/seo/optimizer'
import { ProductCreator } from '@/lib/bigcommerce/product-creator'

export interface ImportRequest {
  etsyUrl: string
  selectedCategories: number[]
  selectedModifiers: number[]
  selectedVariantOptions: number[]
  selectedColors: string[] // Add manual color selections
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
  seoOptions?: {
    generateTags: boolean
    optimizeContent: boolean
    replaceImages: boolean
    maxTags: number
  }
}

export interface ImportResponse {
  success: boolean
  productId?: number
  productUrl?: string
  sku?: string
  seoReport?: {
    tagsAdded: number
    keywordsOptimized: number
    metaGenerated: boolean
    seoScore: number
  }
  processingTime?: number
  error?: string
  warnings?: string[]
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting Etsy import process...')
    
    const body: ImportRequest = await request.json()
    const {
      etsyUrl,
      selectedCategories,
      selectedModifiers,
      selectedVariantOptions,
      selectedColors = [], // Extract manual color selections
      pricing,
      inventory,
      visibility,
      seoOptions = {}
    } = body

    // Validate request
    if (!etsyUrl) {
      return NextResponse.json({
        success: false,
        error: 'Etsy URL is required'
      }, { status: 400 })
    }

    if (!pricing || !pricing.price || pricing.price <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valid pricing information is required'
      }, { status: 400 })
    }

    // Set default SEO options
    const defaultSEOOptions = {
      generateTags: true,
      optimizeContent: true,
      replaceImages: true,
      maxTags: 20,
      ...seoOptions
    }

    console.log(`📄 Scraping Etsy product: ${etsyUrl}`)
    console.log(`📋 Selected categories: ${selectedCategories.length}`)
    console.log(`⚙️ Selected modifiers: ${selectedModifiers.length}`)
    console.log(`🔧 Selected variant options: ${selectedVariantOptions?.length || 0}`)
    console.log(`🎨 Selected colors: ${selectedColors.length} (${selectedColors.join(', ')})`)
    console.log(`💰 Price: $${pricing.price}`)

    // Step 1: Scrape Etsy product
    const scrapeResult = await EtsyHttpScraper.scrapeProduct(etsyUrl)

    if (!scrapeResult.success || !scrapeResult.data) {
      return NextResponse.json({
        success: false,
        error: scrapeResult.error || 'Failed to scrape Etsy product'
      }, { status: 400 })
    }

    const etsyData = scrapeResult.data
    console.log(`✅ Scraped product: ${etsyData.title}`)

    // Step 2: Generate SEO optimization
    console.log('🔍 Generating SEO optimization...')
    const seoResult = await SEOOptimizer.optimizeProduct(etsyData, {
      tagOptions: {
        maxTags: defaultSEOOptions.maxTags,
        includeEtsyTags: true,
        generateKeywords: defaultSEOOptions.generateTags,
        categoryTags: true,
        materialTags: true
      },
      contentOptions: {
        enhanceDescription: defaultSEOOptions.optimizeContent,
        generateImageAlts: defaultSEOOptions.replaceImages
      }
    })

    console.log(`📊 SEO Score: ${seoResult.seoScore}/100`)

    // Step 3: Create new product with selected options
    console.log('🆕 Creating new product in BigCommerce...')
    const creationResult = await ProductCreator.createProductFromEtsy({
      etsyData,
      seoContent: seoResult.seoContent,
      processedTags: seoResult.processedTags,
      selectedCategories,
      selectedModifiers,
      selectedVariantOptions: selectedVariantOptions || [],
      selectedColors, // Pass manual color selections
      pricing,
      inventory,
      visibility
    })

    if (!creationResult.success) {
      return NextResponse.json({
        success: false,
        error: creationResult.error || 'Failed to create product'
      }, { status: 500 })
    }

    const processingTime = Date.now() - startTime

    console.log(`✅ Import completed successfully in ${processingTime}ms`)
    console.log(`🆕 Created product ID: ${creationResult.productId}`)
    console.log(`🔢 Generated SKU: ${creationResult.sku}`)

    // Generate SEO report
    const seoReport = {
      tagsAdded: seoResult.processedTags.finalTags.length,
      keywordsOptimized: seoResult.keywordAnalysis.primaryKeywords.length + seoResult.keywordAnalysis.secondaryKeywords.length,
      metaGenerated: !!(seoResult.seoContent.metaTitle && seoResult.seoContent.metaDescription),
      seoScore: seoResult.seoScore
    }

    return NextResponse.json({
      success: true,
      productId: creationResult.productId,
      productUrl: creationResult.productUrl,
      seoReport,
      processingTime,
      warnings: creationResult.warnings
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ Import failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime
    }, { status: 500 })
  }
}

// GET endpoint for import status/info
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Etsy import service is running',
    process: [
      '1. Scrape Etsy product data',
      '2. Generate SEO optimization',
      '3. Create new product with fresh SKU',
      '4. Apply selected categories',
      '5. Apply selected shared modifiers',
      '6. Upload optimized images',
      '7. Set pricing and inventory'
    ],
    features: {
      seo: [
        'Keyword analysis',
        'Tag generation',
        'Meta title optimization',
        'Meta description creation',
        'URL slug generation',
        'Image alt text generation'
      ],
      customization: [
        'Category selection',
        'Shared modifier selection',
        'Custom pricing',
        'Inventory management',
        'Visibility control',
        'Automatic SKU generation'
      ]
    }
  })
}
