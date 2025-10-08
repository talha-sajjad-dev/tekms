import { KeywordAnalyzer } from './keyword-analyzer'
import { TagProcessor } from './tag-processor'
import slugify from 'slugify'

export interface SEOContent {
  metaTitle: string
  metaDescription: string
  urlSlug: string
  enhancedDescription: string
  imageAltTexts: string[]
  searchKeywords: string
  pageTitle: string
}

export interface ContentGenerationOptions {
  maxMetaTitleLength: number
  maxMetaDescriptionLength: number
  includeKeywords: boolean
  enhanceDescription: boolean
  generateImageAlts: boolean
}

export class ContentGenerator {
  private static readonly DEFAULT_OPTIONS: ContentGenerationOptions = {
    maxMetaTitleLength: 60,
    maxMetaDescriptionLength: 160,
    includeKeywords: true,
    enhanceDescription: true,
    generateImageAlts: true
  }

  private static readonly POWER_WORDS = [
    'amazing', 'beautiful', 'stunning', 'gorgeous', 'elegant', 'premium', 'luxury',
    'handmade', 'unique', 'custom', 'artisan', 'quality', 'perfect', 'exclusive',
    'stylish', 'trendy', 'modern', 'classic', 'vintage', 'chic', 'sophisticated'
  ]

  private static readonly ACTION_WORDS = [
    'discover', 'explore', 'shop', 'find', 'get', 'buy', 'order', 'choose',
    'browse', 'select', 'experience', 'enjoy', 'love', 'adore', 'treasure'
  ]

  static generateSEOContent(
    title: string,
    description: string,
    tags: string[] = [],
    images: string[] = [],
    category: string = '',
    options: Partial<ContentGenerationOptions> = {}
  ): SEOContent {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    
    console.log('📝 Generating SEO content...')

    // Analyze content for keywords
    const keywordAnalysis = KeywordAnalyzer.analyzeContent(title, description, tags)
    
    // Generate meta title
    const metaTitle = this.generateMetaTitle(title, keywordAnalysis, opts.maxMetaTitleLength)
    
    // Generate meta description
    const metaDescription = this.generateMetaDescription(
      title, 
      description, 
      keywordAnalysis, 
      opts.maxMetaDescriptionLength
    )
    
    // Generate URL slug
    const urlSlug = this.generateUrlSlug(title)
    
    // Generate enhanced description
    const enhancedDescription = opts.enhanceDescription 
      ? this.enhanceDescription(description, keywordAnalysis)
      : description
    
    // Generate image alt texts
    const imageAltTexts = opts.generateImageAlts 
      ? this.generateImageAltTexts(title, keywordAnalysis, images.length)
      : []
    
    // Generate search keywords
    const searchKeywords = this.generateSearchKeywords(keywordAnalysis)
    
    // Generate page title (can be different from meta title)
    const pageTitle = this.generatePageTitle(title, keywordAnalysis)

    console.log('✅ Generated SEO content successfully')

    return {
      metaTitle,
      metaDescription,
      urlSlug,
      enhancedDescription,
      imageAltTexts,
      searchKeywords,
      pageTitle
    }
  }

  private static generateMetaTitle(
    originalTitle: string, 
    keywordAnalysis: any, 
    maxLength: number
  ): string {
    // Start with the original title
    let metaTitle = originalTitle.trim()

    // If title is too long, try to shorten it while keeping keywords
    if (metaTitle.length > maxLength) {
      // Try to keep the most important keywords
      const primaryKeywords = keywordAnalysis.primaryKeywords.slice(0, 3)
      const titleWords = metaTitle.split(' ')
      
      // Build a shorter title with key words
      let shortenedTitle = ''
      for (const word of titleWords) {
        const testTitle = shortenedTitle + (shortenedTitle ? ' ' : '') + word
        if (testTitle.length <= maxLength - 10) { // Leave room for additions
          shortenedTitle = testTitle
        } else {
          break
        }
      }
      
      metaTitle = shortenedTitle || metaTitle.substring(0, maxLength - 3) + '...'
    }

    // Add a power word if there's room
    if (metaTitle.length < maxLength - 15) {
      const powerWord = this.selectRelevantPowerWord(metaTitle)
      if (powerWord && !metaTitle.toLowerCase().includes(powerWord)) {
        const addition = ` - ${powerWord.charAt(0).toUpperCase() + powerWord.slice(1)}`
        if (metaTitle.length + addition.length <= maxLength) {
          metaTitle += addition
        }
      }
    }

    return metaTitle.substring(0, maxLength)
  }

  private static generateMetaDescription(
    title: string,
    description: string,
    keywordAnalysis: any,
    maxLength: number
  ): string {
    // Start with a compelling opening
    const actionWord = this.ACTION_WORDS[Math.floor(Math.random() * this.ACTION_WORDS.length)]
    const powerWord = this.selectRelevantPowerWord(title + ' ' + description)
    
    let metaDesc = `${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)} ${powerWord ? powerWord + ' ' : ''}${title.toLowerCase()}.`

    // Add key benefits or features from description
    const benefits = this.extractBenefits(description)
    if (benefits.length > 0 && metaDesc.length < maxLength - 50) {
      metaDesc += ` ${benefits[0]}`
    }

    // Add primary keywords naturally
    const primaryKeywords = keywordAnalysis.primaryKeywords.slice(0, 2)
    for (const keyword of primaryKeywords) {
      if (!metaDesc.toLowerCase().includes(keyword.toLowerCase()) && 
          metaDesc.length + keyword.length + 10 < maxLength) {
        metaDesc += ` Perfect for ${keyword} lovers.`
        break
      }
    }

    // Add call to action if there's room
    if (metaDesc.length < maxLength - 20) {
      metaDesc += ' Shop now!'
    }

    return metaDesc.substring(0, maxLength)
  }

  private static generateUrlSlug(title: string): string {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[\*+~.()'"!:@]/g
    }).substring(0, 100) // Limit slug length
  }

  private static enhanceDescription(
    originalDescription: string,
    keywordAnalysis: any
  ): string {
    let enhanced = originalDescription

    // Add keywords naturally if they're missing
    const missingKeywords = keywordAnalysis.primaryKeywords.filter((keyword: string) => 
      !enhanced.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 3)

    if (missingKeywords.length > 0) {
      // Add a paragraph with missing keywords
      const keywordSentence = `This ${missingKeywords.join(' and ')} item is perfect for those who appreciate quality and style.`
      enhanced += `\n\n${keywordSentence}`
    }

    // Add benefits section if description is short
    if (enhanced.length < 200) {
      const benefits = [
        'High-quality materials and craftsmanship',
        'Perfect for gifts or personal use',
        'Unique design that stands out',
        'Carefully made with attention to detail'
      ]
      
      enhanced += `\n\nKey Features:\n• ${benefits.slice(0, 2).join('\n• ')}`
    }

    // Add SEO-friendly closing
    if (!enhanced.toLowerCase().includes('shop') && !enhanced.toLowerCase().includes('buy')) {
      enhanced += '\n\nShop with confidence - your satisfaction is our priority!'
    }

    return enhanced
  }

  private static generateImageAltTexts(
    title: string,
    keywordAnalysis: any,
    imageCount: number
  ): string[] {
    const altTexts: string[] = []
    const baseTitle = title.toLowerCase()
    const keywords = keywordAnalysis.primaryKeywords.slice(0, 5)

    for (let i = 0; i < imageCount; i++) {
      let altText = ''

      if (i === 0) {
        // Main product image
        altText = `${title} - Main Product Image`
      } else if (i === 1 && keywords.length > 0) {
        // Detail image with keyword
        altText = `${title} - ${keywords[0]} Detail View`
      } else if (i === 2 && keywords.length > 1) {
        // Another angle with keyword
        altText = `${title} - ${keywords[1]} Close-up`
      } else {
        // Generic descriptive alt text
        const descriptors = ['Detail', 'Close-up', 'Side View', 'Back View', 'Texture', 'Pattern', 'Design']
        const descriptor = descriptors[i % descriptors.length]
        altText = `${title} - ${descriptor} Image`
      }

      altTexts.push(altText)
    }

    return altTexts
  }

  private static generateSearchKeywords(keywordAnalysis: any): string {
    // Combine all keywords into a comma-separated string
    const allKeywords = [
      ...keywordAnalysis.primaryKeywords.slice(0, 5),
      ...keywordAnalysis.secondaryKeywords.slice(0, 10),
      ...keywordAnalysis.longTailKeywords.slice(0, 5)
    ]

    return allKeywords.join(', ')
  }

  private static generatePageTitle(title: string, keywordAnalysis: any): string {
    // Page title can be longer than meta title
    let pageTitle = title

    // Add primary keyword if not already included
    const primaryKeyword = keywordAnalysis.primaryKeywords[0]
    if (primaryKeyword && !pageTitle.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      pageTitle = `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} - ${pageTitle}`
    }

    return pageTitle
  }

  private static selectRelevantPowerWord(text: string): string {
    const textLower = text.toLowerCase()
    
    // Find power words that are relevant to the content
    const relevantWords = this.POWER_WORDS.filter(word => {
      // Don't repeat words already in the text
      if (textLower.includes(word)) return false
      
      // Select based on content type
      if (textLower.includes('jewelry') || textLower.includes('accessory')) {
        return ['elegant', 'stunning', 'beautiful', 'luxury'].includes(word)
      }
      if (textLower.includes('handmade') || textLower.includes('craft')) {
        return ['artisan', 'unique', 'quality', 'handmade'].includes(word)
      }
      if (textLower.includes('vintage') || textLower.includes('antique')) {
        return ['vintage', 'classic', 'unique'].includes(word)
      }
      
      return ['beautiful', 'amazing', 'quality', 'perfect'].includes(word)
    })

    return relevantWords[0] || this.POWER_WORDS[0]
  }

  private static extractBenefits(description: string): string[] {
    const benefits: string[] = []
    const descLower = description.toLowerCase()

    // Look for benefit indicators
    const benefitPatterns = [
      /perfect for [^.!?]*/gi,
      /great for [^.!?]*/gi,
      /ideal for [^.!?]*/gi,
      /made with [^.!?]*/gi,
      /features [^.!?]*/gi,
      /includes [^.!?]*/gi
    ]

    benefitPatterns.forEach(pattern => {
      const matches = description.match(pattern)
      if (matches) {
        benefits.push(...matches.map(match => match.trim()))
      }
    })

    // Add generic benefits based on content
    if (descLower.includes('handmade')) {
      benefits.push('Handcrafted with care and attention to detail')
    }
    if (descLower.includes('unique')) {
      benefits.push('One-of-a-kind design you won\'t find elsewhere')
    }
    if (descLower.includes('quality')) {
      benefits.push('Premium quality materials and construction')
    }

    return benefits.slice(0, 3) // Limit to top 3 benefits
  }

  static optimizeForSearch(content: string, keywords: string[]): string {
    let optimized = content

    // Ensure primary keywords appear naturally
    keywords.slice(0, 3).forEach(keyword => {
      if (!optimized.toLowerCase().includes(keyword.toLowerCase())) {
        // Try to add keyword naturally
        const sentences = optimized.split('. ')
        if (sentences.length > 1) {
          sentences[1] = sentences[1].replace(/^/, `This ${keyword} `)
          optimized = sentences.join('. ')
        }
      }
    })

    return optimized
  }

  static calculateSEOScore(content: SEOContent, keywords: string[]): number {
    let score = 0

    // Meta title optimization (25 points)
    if (content.metaTitle.length >= 30 && content.metaTitle.length <= 60) score += 15
    if (keywords.some(k => content.metaTitle.toLowerCase().includes(k.toLowerCase()))) score += 10

    // Meta description optimization (25 points)
    if (content.metaDescription.length >= 120 && content.metaDescription.length <= 160) score += 15
    if (keywords.some(k => content.metaDescription.toLowerCase().includes(k.toLowerCase()))) score += 10

    // URL slug optimization (15 points)
    if (content.urlSlug.length <= 100) score += 5
    if (keywords.some(k => content.urlSlug.includes(k.toLowerCase().replace(/\s+/g, '-')))) score += 10

    // Content optimization (20 points)
    const keywordDensity = keywords.filter(k => 
      content.enhancedDescription.toLowerCase().includes(k.toLowerCase())
    ).length / keywords.length
    score += Math.min(keywordDensity * 20, 20)

    // Image alt texts (15 points)
    if (content.imageAltTexts.length > 0) score += 10
    if (content.imageAltTexts.some(alt => keywords.some(k => alt.toLowerCase().includes(k.toLowerCase())))) score += 5

    return Math.min(score, 100)
  }
}