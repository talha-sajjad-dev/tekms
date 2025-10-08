import * as natural from 'natural'
const keywordExtractor = require('keyword-extractor')

export interface KeywordAnalysis {
  primaryKeywords: string[]
  secondaryKeywords: string[]
  longTailKeywords: string[]
  keywordDensity: Record<string, number>
  suggestions: string[]
}

export class KeywordAnalyzer {
  private static readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'shall', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i',
    'me', 'him', 'her', 'them', 'us', 'my', 'your', 'his', 'her', 'their', 'our'
  ])

  private static readonly COMMON_ECOMMERCE_WORDS = new Set([
    'buy', 'purchase', 'order', 'shop', 'store', 'sale', 'discount', 'price', 'cost',
    'shipping', 'delivery', 'free', 'new', 'best', 'quality', 'premium', 'luxury',
    'handmade', 'custom', 'unique', 'vintage', 'modern', 'classic'
  ])

  static analyzeContent(title: string, description: string, tags: string[] = []): KeywordAnalysis {
    console.log('🔍 Analyzing content for keywords...')

    // Combine all text content
    const allText = `${title} ${description} ${tags.join(' ')}`
    
    // Extract keywords using multiple methods
    const extractedKeywords = this.extractKeywords(allText)
    const ngramKeywords = this.extractNGrams(allText)
    const tagKeywords = this.processExistingTags(tags)
    
    // Combine and deduplicate
    const allKeywords = [...new Set([...extractedKeywords, ...ngramKeywords, ...tagKeywords])]
    
    // Calculate keyword density
    const keywordDensity = this.calculateKeywordDensity(allText, allKeywords)
    
    // Categorize keywords
    const categorized = this.categorizeKeywords(allKeywords, keywordDensity)
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(title, description, categorized.primaryKeywords)

    console.log(`✅ Found ${allKeywords.length} total keywords`)

    return {
      primaryKeywords: categorized.primaryKeywords,
      secondaryKeywords: categorized.secondaryKeywords,
      longTailKeywords: categorized.longTailKeywords,
      keywordDensity,
      suggestions
    }
  }

  private static extractKeywords(text: string): string[] {
    try {
      // Use keyword-extractor library
      const keywords = keywordExtractor.extract(text, {
        language: 'english',
        remove_digits: false,
        return_changed_case: true,
        remove_duplicates: true
      })

      // Filter out stop words and short words
      return keywords
        .filter((keyword: string) => keyword.length >= 3)
        .filter((keyword: string) => !this.STOP_WORDS.has(keyword.toLowerCase()))
        .slice(0, 50) // Limit to top 50

    } catch (error) {
      console.warn('Keyword extraction failed:', error)
      return this.fallbackKeywordExtraction(text)
    }
  }

  private static fallbackKeywordExtraction(text: string): string[] {
    // Simple fallback: split by spaces and filter
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !this.STOP_WORDS.has(word))
      .slice(0, 30)
  }

  private static extractNGrams(text: string, n: number = 2): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !this.STOP_WORDS.has(word))

    const ngrams: string[] = []

    // Extract 2-grams and 3-grams
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ')
      if (ngram.length >= 6) { // Minimum length for meaningful phrases
        ngrams.push(ngram)
      }
    }

    // Also extract 3-grams
    if (n === 2) {
      ngrams.push(...this.extractNGrams(text, 3))
    }

    return [...new Set(ngrams)].slice(0, 20)
  }

  private static processExistingTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length >= 3)
      .filter(tag => !this.STOP_WORDS.has(tag))
  }

  private static calculateKeywordDensity(text: string, keywords: string[]): Record<string, number> {
    const textLower = text.toLowerCase()
    const totalWords = textLower.split(/\s+/).length
    const density: Record<string, number> = {}

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      // Escape special regex characters to prevent invalid regex patterns
      const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = (textLower.match(new RegExp(escapedKeyword, 'g')) || []).length
      density[keyword] = (matches / totalWords) * 100
    })

    return density
  }

  private static categorizeKeywords(
    keywords: string[], 
    density: Record<string, number>
  ): {
    primaryKeywords: string[]
    secondaryKeywords: string[]
    longTailKeywords: string[]
  } {
    // Sort by density and relevance
    const sortedKeywords = keywords.sort((a, b) => {
      const densityA = density[a] || 0
      const densityB = density[b] || 0
      
      // Prioritize higher density and ecommerce relevance
      const scoreA = densityA + (this.COMMON_ECOMMERCE_WORDS.has(a.toLowerCase()) ? 1 : 0)
      const scoreB = densityB + (this.COMMON_ECOMMERCE_WORDS.has(b.toLowerCase()) ? 1 : 0)
      
      return scoreB - scoreA
    })

    // Categorize based on word count and density
    const primaryKeywords: string[] = []
    const secondaryKeywords: string[] = []
    const longTailKeywords: string[] = []

    sortedKeywords.forEach(keyword => {
      const wordCount = keyword.split(' ').length
      const keywordDensity = density[keyword] || 0

      if (wordCount === 1 && keywordDensity > 0.5) {
        primaryKeywords.push(keyword)
      } else if (wordCount <= 2 && keywordDensity > 0.2) {
        secondaryKeywords.push(keyword)
      } else if (wordCount >= 3) {
        longTailKeywords.push(keyword)
      } else {
        secondaryKeywords.push(keyword)
      }
    })

    return {
      primaryKeywords: primaryKeywords.slice(0, 10),
      secondaryKeywords: secondaryKeywords.slice(0, 15),
      longTailKeywords: longTailKeywords.slice(0, 10)
    }
  }

  private static generateSuggestions(
    title: string, 
    description: string, 
    primaryKeywords: string[]
  ): string[] {
    const suggestions: string[] = []

    // Generate category-based suggestions
    const categoryKeywords = this.inferCategoryKeywords(title, description)
    suggestions.push(...categoryKeywords)

    // Generate attribute-based suggestions
    const attributeKeywords = this.inferAttributeKeywords(title, description)
    suggestions.push(...attributeKeywords)

    // Generate use-case suggestions
    const useCaseKeywords = this.inferUseCaseKeywords(title, description)
    suggestions.push(...useCaseKeywords)

    // Generate material/style suggestions
    const materialKeywords = this.inferMaterialKeywords(title, description)
    suggestions.push(...materialKeywords)

    // Remove duplicates and limit
    return [...new Set(suggestions)]
      .filter(suggestion => !primaryKeywords.includes(suggestion))
      .slice(0, 20)
  }

  private static inferCategoryKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase()
    const categories: string[] = []

    // Common product categories
    const categoryMap = {
      jewelry: ['jewelry', 'necklace', 'bracelet', 'earrings', 'ring', 'pendant'],
      clothing: ['shirt', 'dress', 'pants', 'jacket', 'sweater', 'top'],
      home: ['decor', 'furniture', 'pillow', 'candle', 'vase', 'lamp'],
      art: ['painting', 'print', 'poster', 'artwork', 'canvas', 'frame'],
      craft: ['handmade', 'diy', 'craft', 'supplies', 'materials'],
      accessories: ['bag', 'wallet', 'scarf', 'hat', 'belt', 'purse']
    }

    Object.entries(categoryMap).forEach(([category, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        categories.push(category)
      }
    })

    return categories
  }

  private static inferAttributeKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase()
    const attributes: string[] = []

    // Common attributes
    const attributePatterns = [
      /\b(small|medium|large|xl|xxl)\b/g,
      /\b(red|blue|green|yellow|black|white|pink|purple|orange)\b/g,
      /\b(cotton|silk|wool|leather|metal|wood|glass|ceramic)\b/g,
      /\b(vintage|modern|classic|contemporary|rustic|minimalist)\b/g,
      /\b(handmade|custom|personalized|unique|one-of-a-kind)\b/g
    ]

    attributePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        attributes.push(...matches)
      }
    })

    return [...new Set(attributes)]
  }

  private static inferUseCaseKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase()
    const useCases: string[] = []

    // Common use cases
    const useCasePatterns = [
      /\b(gift|present|birthday|wedding|anniversary|christmas|holiday)\b/g,
      /\b(office|home|bedroom|kitchen|bathroom|living room)\b/g,
      /\b(party|event|celebration|special occasion)\b/g,
      /\b(daily|everyday|casual|formal|professional)\b/g
    ]

    useCasePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        useCases.push(...matches)
      }
    })

    return [...new Set(useCases)]
  }

  private static inferMaterialKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase()
    const materials: string[] = []

    // Common materials
    const materialPatterns = [
      /\b(sterling silver|gold|brass|copper|stainless steel)\b/g,
      /\b(cotton|linen|silk|wool|cashmere|polyester)\b/g,
      /\b(leather|suede|canvas|denim|velvet)\b/g,
      /\b(wood|bamboo|oak|pine|mahogany)\b/g,
      /\b(glass|crystal|ceramic|porcelain|stone)\b/g
    ]

    materialPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        materials.push(...matches)
      }
    })

    return [...new Set(materials)]
  }
}