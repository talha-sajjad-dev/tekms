import { EtsyProductData } from '../etsy/scraper'
import { KeywordAnalyzer, KeywordAnalysis } from './keyword-analyzer'
import { TagProcessor, ProcessedTags, TagProcessingOptions } from './tag-processor'
import { ContentGenerator, SEOContent, ContentGenerationOptions } from './content-generator'

export interface SEOOptimizationOptions {
  tagOptions?: Partial<TagProcessingOptions>
  contentOptions?: Partial<ContentGenerationOptions>
  customKeywords?: string[]
  customTags?: string[]
  customMetaTitle?: string
  customMetaDescription?: string
}

export interface SEOOptimizationResult {
  keywordAnalysis: KeywordAnalysis
  processedTags: ProcessedTags
  seoContent: SEOContent
  seoScore: number
  recommendations: string[]
}

export class SEOOptimizer {
  static async optimizeProduct(
    etsyData: EtsyProductData,
    options: SEOOptimizationOptions = {}
  ): Promise<SEOOptimizationResult> {
    console.log('🚀 Starting SEO optimization for:', etsyData.title)

    try {
      // Step 1: Analyze keywords from Etsy data
      console.log('📊 Analyzing keywords...')
      const keywordAnalysis = KeywordAnalyzer.analyzeContent(
        etsyData.title,
        etsyData.description,
        [...etsyData.tags, ...etsyData.materials]
      )

      // Add custom keywords if provided
      if (options.customKeywords) {
        keywordAnalysis.primaryKeywords.push(...options.customKeywords.slice(0, 5))
        keywordAnalysis.primaryKeywords = [...new Set(keywordAnalysis.primaryKeywords)]
      }

      // Step 2: Process and generate tags
      console.log('🏷️ Processing tags...')
      const processedTags = TagProcessor.processProductTags(
        etsyData.title,
        etsyData.description,
        etsyData.tags,
        etsyData.materials,
        etsyData.category,
        options.tagOptions
      )

      // Add custom tags if provided
      if (options.customTags) {
        const validCustomTags = options.customTags.filter(tag => TagProcessor.validateTag(tag))
        processedTags.finalTags.push(...validCustomTags)
        processedTags.finalTags = [...new Set(processedTags.finalTags)]
        
        // Update tag sources
        validCustomTags.forEach(tag => {
          processedTags.tagSources[tag] = 'custom'
        })
      }

      // Step 3: Generate SEO content
      console.log('📝 Generating SEO content...')
      const seoContent = ContentGenerator.generateSEOContent(
        etsyData.title,
        etsyData.description,
        processedTags.finalTags,
        etsyData.images,
        etsyData.category,
        options.contentOptions
      )

      // Apply custom meta data if provided
      if (options.customMetaTitle) {
        seoContent.metaTitle = options.customMetaTitle.substring(0, 60)
      }
      if (options.customMetaDescription) {
        seoContent.metaDescription = options.customMetaDescription.substring(0, 160)
      }

      // Step 4: Calculate SEO score
      console.log('📈 Calculating SEO score...')
      const allKeywords = [
        ...keywordAnalysis.primaryKeywords,
        ...keywordAnalysis.secondaryKeywords
      ]
      const seoScore = ContentGenerator.calculateSEOScore(seoContent, allKeywords)

      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendations(
        etsyData,
        keywordAnalysis,
        processedTags,
        seoContent,
        seoScore
      )

      console.log(`✅ SEO optimization complete! Score: ${seoScore}/100`)

      return {
        keywordAnalysis,
        processedTags,
        seoContent,
        seoScore,
        recommendations
      }

    } catch (error) {
      console.error('❌ SEO optimization failed:', error)
      throw new Error(`SEO optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static generateRecommendations(
    etsyData: EtsyProductData,
    keywordAnalysis: KeywordAnalysis,
    processedTags: ProcessedTags,
    seoContent: SEOContent,
    seoScore: number
  ): string[] {
    const recommendations: string[] = []

    // Title recommendations
    if (seoContent.metaTitle.length < 30) {
      recommendations.push('Consider making your title longer (30-60 characters) for better SEO')
    }
    if (seoContent.metaTitle.length > 60) {
      recommendations.push('Your title is too long and may be truncated in search results')
    }

    // Description recommendations
    if (seoContent.metaDescription.length < 120) {
      recommendations.push('Your meta description could be longer (120-160 characters) to provide more information')
    }
    if (etsyData.description.length < 200) {
      recommendations.push('Consider adding more detailed product description for better SEO')
    }

    // Keyword recommendations
    if (keywordAnalysis.primaryKeywords.length < 3) {
      recommendations.push('Try to include more relevant keywords in your title and description')
    }
    if (keywordAnalysis.longTailKeywords.length < 2) {
      recommendations.push('Consider adding more specific, long-tail keywords to target niche searches')
    }

    // Tag recommendations
    if (processedTags.finalTags.length < 10) {
      recommendations.push('Add more tags to improve discoverability (aim for 10-20 tags)')
    }
    if (processedTags.originalTags.length === 0) {
      recommendations.push('The original Etsy listing has no tags - consider adding some manually')
    }

    // Image recommendations
    if (etsyData.images.length < 3) {
      recommendations.push('More product images would improve SEO and customer engagement')
    }
    if (seoContent.imageAltTexts.length === 0) {
      recommendations.push('Add descriptive alt text to images for better accessibility and SEO')
    }

    // Content quality recommendations
    const hasCallToAction = seoContent.enhancedDescription.toLowerCase().includes('shop') ||
                           seoContent.enhancedDescription.toLowerCase().includes('buy') ||
                           seoContent.enhancedDescription.toLowerCase().includes('order')
    if (!hasCallToAction) {
      recommendations.push('Consider adding a call-to-action in your product description')
    }

    // Category recommendations
    if (etsyData.category === 'General' || !etsyData.category) {
      recommendations.push('Specify a more detailed product category for better categorization')
    }

    // Material recommendations
    if (etsyData.materials.length === 0) {
      recommendations.push('Adding material information can help with search visibility')
    }

    // Overall score recommendations
    if (seoScore < 70) {
      recommendations.push('Your SEO score could be improved - focus on title, description, and keyword optimization')
    } else if (seoScore >= 90) {
      recommendations.push('Excellent SEO optimization! Your product should perform well in search results')
    }

    // Limit recommendations to most important ones
    return recommendations.slice(0, 8)
  }

  static generateSEOReport(result: SEOOptimizationResult): string {
    const { keywordAnalysis, processedTags, seoContent, seoScore, recommendations } = result

    return `
# SEO Optimization Report

## Overall Score: ${seoScore}/100

## Keywords Analysis
- **Primary Keywords**: ${keywordAnalysis.primaryKeywords.slice(0, 5).join(', ')}
- **Secondary Keywords**: ${keywordAnalysis.secondaryKeywords.slice(0, 5).join(', ')}
- **Long-tail Keywords**: ${keywordAnalysis.longTailKeywords.slice(0, 3).join(', ')}

## Tags Summary
- **Total Tags**: ${processedTags.finalTags.length}
- **Original Etsy Tags**: ${processedTags.originalTags.length}
- **Generated Tags**: ${processedTags.generatedTags.length}
- **Final Tags**: ${processedTags.finalTags.join(', ')}

## SEO Content
- **Meta Title**: ${seoContent.metaTitle} (${seoContent.metaTitle.length} chars)
- **Meta Description**: ${seoContent.metaDescription} (${seoContent.metaDescription.length} chars)
- **URL Slug**: ${seoContent.urlSlug}
- **Search Keywords**: ${seoContent.searchKeywords}

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Image Alt Texts
${seoContent.imageAltTexts.map((alt, i) => `- Image ${i + 1}: ${alt}`).join('\n')}
    `.trim()
  }

  static validateSEOContent(seoContent: SEOContent): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate meta title
    if (!seoContent.metaTitle || seoContent.metaTitle.length === 0) {
      errors.push('Meta title is required')
    } else if (seoContent.metaTitle.length > 60) {
      errors.push('Meta title is too long (max 60 characters)')
    } else if (seoContent.metaTitle.length < 30) {
      errors.push('Meta title is too short (min 30 characters recommended)')
    }

    // Validate meta description
    if (!seoContent.metaDescription || seoContent.metaDescription.length === 0) {
      errors.push('Meta description is required')
    } else if (seoContent.metaDescription.length > 160) {
      errors.push('Meta description is too long (max 160 characters)')
    } else if (seoContent.metaDescription.length < 120) {
      errors.push('Meta description is too short (min 120 characters recommended)')
    }

    // Validate URL slug
    if (!seoContent.urlSlug || seoContent.urlSlug.length === 0) {
      errors.push('URL slug is required')
    } else if (!/^[a-z0-9-]+$/.test(seoContent.urlSlug)) {
      errors.push('URL slug contains invalid characters (only lowercase letters, numbers, and hyphens allowed)')
    }

    // Validate enhanced description
    if (!seoContent.enhancedDescription || seoContent.enhancedDescription.length < 100) {
      errors.push('Enhanced description should be at least 100 characters long')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  static previewSEOResult(result: SEOOptimizationResult): {
    searchPreview: string
    tagCloud: string[]
    keywordDensity: Record<string, number>
  } {
    const { seoContent, processedTags, keywordAnalysis } = result

    // Generate search result preview
    const searchPreview = `
${seoContent.metaTitle}
${seoContent.urlSlug}
${seoContent.metaDescription}
    `.trim()

    // Generate tag cloud (sorted by relevance)
    const tagCloud = processedTags.finalTags.slice(0, 20)

    return {
      searchPreview,
      tagCloud,
      keywordDensity: keywordAnalysis.keywordDensity
    }
  }
}