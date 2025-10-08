import { KeywordAnalyzer, KeywordAnalysis } from './keyword-analyzer'
import slugify from 'slugify'

export interface TagProcessingOptions {
  maxTags: number
  includeEtsyTags: boolean
  generateKeywords: boolean
  categoryTags: boolean
  brandTags: boolean
  materialTags: boolean
}

export interface ProcessedTags {
  originalTags: string[]
  generatedTags: string[]
  finalTags: string[]
  removedTags: string[]
  tagSources: Record<string, string>
}

export class TagProcessor {
  private static readonly DEFAULT_OPTIONS: TagProcessingOptions = {
    maxTags: 20,
    includeEtsyTags: true,
    generateKeywords: true,
    categoryTags: true,
    brandTags: true,
    materialTags: true
  }

  private static readonly EXCLUDED_WORDS = new Set([
    'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'buy', 'purchase', 'order', 'shop', 'store', 'item', 'product', 'listing'
  ])

  static processProductTags(
    title: string,
    description: string,
    etsyTags: string[] = [],
    materials: string[] = [],
    category: string = '',
    options: Partial<TagProcessingOptions> = {}
  ): ProcessedTags {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    
    console.log('🏷️ Processing product tags...')

    // Start with original Etsy tags
    const originalTags = opts.includeEtsyTags ? [...etsyTags] : []
    const generatedTags: string[] = []
    const tagSources: Record<string, string> = {}

    // Track sources for original tags
    originalTags.forEach(tag => {
      tagSources[tag] = 'etsy'
    })

    // Generate keyword-based tags
    if (opts.generateKeywords) {
      const keywordAnalysis = KeywordAnalyzer.analyzeContent(title, description, etsyTags)
      const keywordTags = this.generateKeywordTags(keywordAnalysis)
      
      keywordTags.forEach(tag => {
        if (!generatedTags.includes(tag) && !originalTags.includes(tag)) {
          generatedTags.push(tag)
          tagSources[tag] = 'keywords'
        }
      })
    }

    // Generate category tags
    if (opts.categoryTags && category) {
      const categoryTags = this.generateCategoryTags(category, title, description)
      categoryTags.forEach(tag => {
        if (!generatedTags.includes(tag) && !originalTags.includes(tag)) {
          generatedTags.push(tag)
          tagSources[tag] = 'category'
        }
      })
    }

    // Generate material tags
    if (opts.materialTags && materials.length > 0) {
      const materialTags = this.generateMaterialTags(materials, title, description)
      materialTags.forEach(tag => {
        if (!generatedTags.includes(tag) && !originalTags.includes(tag)) {
          generatedTags.push(tag)
          tagSources[tag] = 'materials'
        }
      })
    }

    // Generate brand/style tags
    if (opts.brandTags) {
      const brandTags = this.generateBrandStyleTags(title, description)
      brandTags.forEach(tag => {
        if (!generatedTags.includes(tag) && !originalTags.includes(tag)) {
          generatedTags.push(tag)
          tagSources[tag] = 'brand'
        }
      })
    }

    // Combine and clean tags
    const allTags = [...originalTags, ...generatedTags]
    const cleanedTags = this.cleanAndValidateTags(allTags)
    
    // Prioritize and limit tags
    const { finalTags, removedTags } = this.prioritizeAndLimitTags(
      cleanedTags, 
      tagSources, 
      opts.maxTags
    )

    console.log(`✅ Processed ${finalTags.length} final tags from ${allTags.length} candidates`)

    return {
      originalTags,
      generatedTags,
      finalTags,
      removedTags,
      tagSources
    }
  }

  private static generateKeywordTags(analysis: KeywordAnalysis): string[] {
    const tags: string[] = []

    // Add primary keywords (single words)
    analysis.primaryKeywords
      .filter(keyword => keyword.split(' ').length === 1)
      .forEach(keyword => tags.push(keyword))

    // Add secondary keywords (1-2 words)
    analysis.secondaryKeywords
      .filter(keyword => keyword.split(' ').length <= 2)
      .forEach(keyword => tags.push(keyword))

    // Add selected long-tail keywords (3+ words, but limit them)
    analysis.longTailKeywords
      .slice(0, 5) // Only top 5 long-tail keywords
      .forEach(keyword => tags.push(keyword))

    // Add keyword suggestions
    analysis.suggestions
      .slice(0, 10)
      .forEach(suggestion => tags.push(suggestion))

    return tags
  }

  private static generateCategoryTags(category: string, title: string, description: string): string[] {
    const tags: string[] = []
    const text = `${title} ${description}`.toLowerCase()

    // Add the main category
    if (category && category !== 'General') {
      tags.push(category.toLowerCase())
    }

    // Generate related category tags based on content
    const categoryMappings = {
      'jewelry': ['accessories', 'fashion', 'handmade jewelry', 'artisan jewelry'],
      'clothing': ['fashion', 'apparel', 'wearable', 'style'],
      'home decor': ['home', 'decor', 'interior design', 'home accessories'],
      'art': ['artwork', 'wall art', 'creative', 'artistic'],
      'craft supplies': ['crafting', 'diy', 'supplies', 'materials'],
      'bags': ['accessories', 'fashion', 'handbags', 'purses'],
      'toys': ['kids', 'children', 'play', 'educational'],
      'vintage': ['retro', 'antique', 'collectible', 'classic']
    }

    // Find matching categories
    Object.entries(categoryMappings).forEach(([key, relatedTags]) => {
      if (text.includes(key) || category.toLowerCase().includes(key)) {
        tags.push(...relatedTags)
      }
    })

    return tags
  }

  private static generateMaterialTags(materials: string[], title: string, description: string): string[] {
    const tags: string[] = []
    const text = `${title} ${description}`.toLowerCase()

    // Add material tags
    materials.forEach(material => {
      if (material && material.length > 2) {
        tags.push(material.toLowerCase())
        
        // Add related material tags
        const materialRelations = this.getMaterialRelations(material.toLowerCase())
        tags.push(...materialRelations)
      }
    })

    // Detect materials from text
    const detectedMaterials = this.detectMaterialsFromText(text)
    tags.push(...detectedMaterials)

    return tags
  }

  private static getMaterialRelations(material: string): string[] {
    const relations: Record<string, string[]> = {
      'sterling silver': ['silver', 'metal', 'jewelry metal'],
      'gold': ['precious metal', 'jewelry metal', 'luxury'],
      'leather': ['genuine leather', 'natural material'],
      'cotton': ['natural fiber', 'fabric', 'textile'],
      'wood': ['natural material', 'wooden', 'handcrafted'],
      'ceramic': ['pottery', 'clay', 'handmade ceramic'],
      'glass': ['glassware', 'transparent', 'fragile'],
      'silk': ['luxury fabric', 'natural fiber', 'premium']
    }

    return relations[material] || []
  }

  private static detectMaterialsFromText(text: string): string[] {
    const materials: string[] = []
    
    const materialPatterns = [
      /\b(sterling silver|stainless steel|gold plated|rose gold)\b/g,
      /\b(cotton|linen|silk|wool|cashmere|polyester|nylon)\b/g,
      /\b(leather|suede|canvas|denim|velvet|satin)\b/g,
      /\b(wood|wooden|bamboo|oak|pine|mahogany|teak)\b/g,
      /\b(ceramic|porcelain|clay|pottery|glass|crystal)\b/g,
      /\b(plastic|acrylic|resin|rubber|silicone)\b/g
    ]

    materialPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        materials.push(...matches.map(match => match.trim()))
      }
    })

    return [...new Set(materials)]
  }

  private static generateBrandStyleTags(title: string, description: string): string[] {
    const tags: string[] = []
    const text = `${title} ${description}`.toLowerCase()

    // Style tags
    const stylePatterns = [
      /\b(vintage|retro|antique|classic|traditional)\b/g,
      /\b(modern|contemporary|minimalist|sleek|clean)\b/g,
      /\b(rustic|farmhouse|country|shabby chic|bohemian|boho)\b/g,
      /\b(elegant|luxury|premium|high-end|sophisticated)\b/g,
      /\b(casual|everyday|simple|basic|comfortable)\b/g,
      /\b(unique|one-of-a-kind|custom|personalized|bespoke)\b/g,
      /\b(handmade|artisan|crafted|handcrafted|homemade)\b/g
    ]

    stylePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        tags.push(...matches.map(match => match.trim()))
      }
    })

    // Occasion tags
    const occasionPatterns = [
      /\b(wedding|bridal|anniversary|engagement)\b/g,
      /\b(birthday|gift|present|holiday|christmas)\b/g,
      /\b(party|celebration|special occasion|event)\b/g,
      /\b(office|work|professional|business)\b/g,
      /\b(casual|daily|everyday|weekend)\b/g
    ]

    occasionPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        tags.push(...matches.map(match => match.trim()))
      }
    })

    return [...new Set(tags)]
  }

  private static cleanAndValidateTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length >= 2) // Minimum length
      .filter(tag => tag.length <= 50) // Maximum length
      .filter(tag => !this.EXCLUDED_WORDS.has(tag))
      .filter(tag => !/^\d+$/.test(tag)) // No pure numbers
      .filter(tag => /^[a-zA-Z0-9\s\-_]+$/.test(tag)) // Only alphanumeric, spaces, hyphens, underscores
      .map(tag => tag.replace(/\s+/g, ' ')) // Clean up spaces
      .filter((tag, index, array) => array.indexOf(tag) === index) // Remove duplicates
  }

  private static prioritizeAndLimitTags(
    tags: string[], 
    sources: Record<string, string>, 
    maxTags: number
  ): { finalTags: string[]; removedTags: string[] } {
    // Priority order: etsy > keywords > category > materials > brand
    const priorityOrder = ['etsy', 'keywords', 'category', 'materials', 'brand']
    
    // Sort tags by priority
    const sortedTags = tags.sort((a, b) => {
      const priorityA = priorityOrder.indexOf(sources[a] || 'unknown')
      const priorityB = priorityOrder.indexOf(sources[b] || 'unknown')
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // Secondary sort by length (shorter tags first)
      return a.length - b.length
    })

    const finalTags = sortedTags.slice(0, maxTags)
    const removedTags = sortedTags.slice(maxTags)

    return { finalTags, removedTags }
  }

  static generateUrlSlug(title: string): string {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[\*+~.()'"!:@]/g
    })
  }

  static validateTag(tag: string): boolean {
    return tag.length >= 2 && 
           tag.length <= 50 && 
           !this.EXCLUDED_WORDS.has(tag.toLowerCase()) &&
           /^[a-zA-Z0-9\s\-_]+$/.test(tag)
  }
}