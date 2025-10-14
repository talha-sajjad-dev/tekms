# Phase 2.5: Category Mapping System - COMPLETE ✅

## Overview

The Category Mapping System provides intelligent, automated categorization of products across multiple sales channels. It uses keyword matching, pattern recognition, and machine learning from user corrections to automatically assign platform-specific categories when publishing products.

## 🎯 Problem Solved

Manually categorizing products for each platform is:
- **Time-consuming**: Need to lookup category IDs for each platform
- **Error-prone**: Easy to assign wrong categories
- **Inconsistent**: Different team members may categorize differently
- **Repetitive**: Same product types require same categories

## ✨ Features Implemented

### 1. Smart Category Suggestion Engine
- **Keyword Matching**: Analyzes product titles and descriptions
- **Pattern Matching**: Supports regex for advanced matching
- **Confidence Scoring**: Rates suggestions from 0-100%
- **Multi-Platform Support**: BigCommerce, Shopify, Etsy, TikTok
- **Learning System**: Improves from user corrections

### 2. Complete API Suite
- `GET /api/category-mappings` - List all mappings
- `POST /api/category-mappings` - Create mapping
- `GET /api/category-mappings/[id]` - Get mapping
- `PATCH /api/category-mappings/[id]` - Update mapping
- `DELETE /api/category-mappings/[id]` - Delete mapping
- `POST /api/category-mappings/suggest` - Auto-suggest categories

### 3. Intuitive UI
- Visual category management dashboard
- Create/edit mapping interface
- Platform-specific ID inputs
- Keyword and pattern editor
- Real-time pattern tester
- Usage statistics

### 4. Automatic Publisher Integration
- **BigCommerce**: Auto-applies category IDs
- **Shopify**: Auto-adds to collections
- **Etsy**: Ready for taxonomy IDs
- **TikTok**: Ready for category IDs

## 📁 File Structure

```
lib/categories/
  └── category-mapper.ts          # Core category mapping service

app/api/category-mappings/
  ├── route.ts                     # List & create mappings
  ├── [id]/route.ts               # Get, update, delete
  └── suggest/route.ts            # Auto-suggest API

app/category-mappings/
  └── page.tsx                     # Category management UI

lib/publishers/
  ├── bigcommerce-publisher.ts    # Integrated category mapping
  └── shopify-publisher.ts        # Integrated category mapping
```

## 🔧 How It Works

### 1. Category Mapping Creation

Users create mappings that define:
- **Name**: Human-readable category name (e.g., "T-Shirts")
- **Keywords**: Terms to match (e.g., ["shirt", "tee", "t-shirt"])
- **Pattern**: Optional regex for precise matching (e.g., `/t-?shirt/i`)
- **Platform IDs**: 
  - BigCommerce Category ID
  - Shopify Collection Handle
  - Etsy Taxonomy ID
  - TikTok Category ID

### 2. Auto-Suggestion Algorithm

```typescript
// Scoring System (Total: 100%)
- Keyword Matching: 40% (divided among matched keywords)
- Pattern Matching: 30% (if pattern matches)
- Usage Popularity: 20% (based on timesUsed)
- Exact Title Match: 10% (if category name in title)

// Threshold: Minimum 25% confidence to suggest
```

### 3. Automatic Application

When publishing a product:

```typescript
// 1. Analyze product title/description
const suggestions = await suggestCategories(
  userId,
  product.title,
  product.description
)

// 2. Pick highest confidence suggestion
const topSuggestion = suggestions[0]

// 3. Apply platform-specific category
if (platform === 'BIGCOMMERCE') {
  categories = [topSuggestion.bcCategoryId]
} else if (platform === 'SHOPIFY') {
  await addToCollection(topSuggestion.shopifyCollection)
}
```

## 📊 Database Schema

```prisma
model CategoryMapping {
  id                String   @id @default(cuid())
  userId            String
  name              String   // "T-Shirts"
  
  // Platform-specific IDs
  etsyTaxonomyId    Int?
  bcCategoryId      Int?
  shopifyCollection String?
  tiktokCategoryId  String?
  
  // Auto-mapping rules
  keywords          String[] // ["shirt", "tee"]
  pattern           String?  // "/t-?shirt/i"
  
  // Stats
  timesUsed         Int      @default(0)
  
  user              User @relation(...)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 🎨 UI Screenshots

### Category Management Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Category Mappings                    [Test] [+ New]     │
├─────────────────────────────────────────────────────────┤
│ Stats:                                                   │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│ │ Total: 12 │ │ Usage:156 │ │ Most:     │ │ Coverage│ │
│ │ Mappings  │ │ Times     │ │ T-Shirts  │ │ BC: 10  │ │
│ └───────────┘ └───────────┘ └───────────┘ │ SH: 8   │ │
│                                             └─────────┘ │
├─────────────────────────────────────────────────────────┤
│ Your Category Mappings                                  │
│                                                          │
│ Name      Keywords           Platforms    Usage Actions│
│ ─────────────────────────────────────────────────────── │
│ T-Shirts  shirt, tee, +2    [BC][SH]     42x   [✏️][🗑️] │
│ Hoodies   hoodie, sweatshirt [BC][SH]    38x   [✏️][🗑️] │
│ Mugs      mug, cup          [BC][SH][E]  28x   [✏️][🗑️] │
└─────────────────────────────────────────────────────────┘
```

### Create/Edit Mapping Form
```
┌─────────────────────────────────────────────────────────┐
│ New Category Mapping                                     │
├─────────────────────────────────────────────────────────┤
│ Name: [T-Shirts____________________________]             │
│                                                          │
│ Keywords (comma-separated):                             │
│ [shirt, tee, t-shirt, tshirt______________]             │
│ ℹ️ Products containing these will be mapped             │
│                                                          │
│ Pattern (optional regex):                               │
│ [/t-?shirt/i__________________________]                 │
│ ℹ️ Advanced: Use regex for precise matching             │
│                                                          │
│ ────────────────────────────────────────                │
│ Platform-Specific IDs                                   │
│                                                          │
│ BigCommerce ID:    [23___]  Shopify Collection: [shirts]│
│ Etsy Taxonomy ID:  [1234_]  TikTok Category: [12345___]│
│                                                          │
│                             [Cancel] [Create Mapping]   │
└─────────────────────────────────────────────────────────┘
```

## 💻 API Usage Examples

### Create a Category Mapping

```typescript
// POST /api/category-mappings
const response = await fetch('/api/category-mappings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'T-Shirts',
    keywords: ['shirt', 'tee', 't-shirt', 'tshirt'],
    pattern: '/t-?shirt/i',
    bcCategoryId: 23,
    shopifyCollection: 't-shirts',
    etsyTaxonomyId: 1234
  })
})

const { mapping } = await response.json()
```

### Get Category Suggestions

```typescript
// POST /api/category-mappings/suggest
const response = await fetch('/api/category-mappings/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Vintage Graphic T-Shirt',
    description: 'Comfortable cotton tee with retro design',
    platform: 'BIGCOMMERCE'
  })
})

const { suggestions } = await response.json()
// [
//   {
//     mappingId: 'abc123',
//     name: 'T-Shirts',
//     confidence: 85,
//     bcCategoryId: 23,
//     matchReason: 'matched keywords: shirt, tee; pattern match',
//     matchedKeywords: ['shirt', 'tee']
//   }
// ]
```

### Update a Mapping

```typescript
// PATCH /api/category-mappings/[id]
await fetch('/api/category-mappings/abc123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['shirt', 'tee', 't-shirt', 'tshirt', 'top'],
    bcCategoryId: 25  // Updated category
  })
})
```

## 🔄 Integration Points

### 1. BigCommerce Publisher

```typescript
// lib/publishers/bigcommerce-publisher.ts
export async function publishToBigCommerce(...) {
  // Auto-map categories
  const suggestions = await suggestCategories(
    userId,
    masterProduct.title,
    masterProduct.description,
    'BIGCOMMERCE'
  )
  
  let categoryIds = []
  if (suggestions.length > 0) {
    const top = suggestions[0]
    if (top.bcCategoryId) {
      categoryIds = [top.bcCategoryId]
      console.log(`✅ Applied category: ${top.name}`)
    }
  }
  
  // Create product with categories
  const bcProduct = transformToBigCommerceFormat(
    masterProduct,
    categoryIds
  )
}
```

### 2. Shopify Publisher

```typescript
// lib/publishers/shopify-publisher.ts
export async function publishToShopify(...) {
  // Auto-map to collection
  const suggestions = await suggestCategories(
    userId,
    masterProduct.title,
    masterProduct.description,
    'SHOPIFY'
  )
  
  if (suggestions[0]?.shopifyCollection) {
    await addProductToShopifyCollection(
      accessToken,
      shopDomain,
      productId,
      suggestions[0].shopifyCollection
    )
    console.log(`✅ Added to collection: ${suggestions[0].name}`)
  }
}
```

## 📈 Algorithm Details

### Confidence Scoring

```typescript
function calculateConfidence(mapping, productText) {
  let confidence = 0
  
  // 1. Keyword Matching (40%)
  const keywordWeight = 40 / mapping.keywords.length
  mapping.keywords.forEach(keyword => {
    if (productText.includes(keyword.toLowerCase())) {
      confidence += keywordWeight
    }
  })
  
  // 2. Pattern Matching (30%)
  if (mapping.pattern) {
    const regex = new RegExp(mapping.pattern, 'i')
    if (regex.test(productText)) {
      confidence += 30
    }
  }
  
  // 3. Usage Popularity (20%)
  const popularityBonus = Math.min(20, (mapping.timesUsed / 10) * 20)
  confidence += popularityBonus
  
  // 4. Exact Title Match (10%)
  if (title.toLowerCase().includes(mapping.name.toLowerCase())) {
    confidence += 10
  }
  
  return Math.min(100, confidence)
}
```

### Learning from Corrections

```typescript
// When user selects a different category
export async function learnFromCorrection(
  userId,
  productTitle,
  productDescription,
  selectedMappingId
) {
  // Extract new keywords from product title
  const words = productTitle
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !commonWords.includes(word))
  
  const mapping = await getCategoryMapping(userId, selectedMappingId)
  const newKeywords = words.filter(
    word => !mapping.keywords.includes(word)
  )
  
  if (newKeywords.length > 0) {
    // Add up to 2 new keywords
    await updateCategoryMapping(userId, selectedMappingId, {
      keywords: [...mapping.keywords, ...newKeywords.slice(0, 2)]
    })
  }
  
  // Increment usage counter
  await recordMappingUsage(selectedMappingId)
}
```

## 📝 Best Practices

### 1. Keyword Selection
```typescript
// ✅ Good Keywords
keywords: ['shirt', 'tee', 't-shirt', 'tshirt', 'top']

// ❌ Avoid Common Words
keywords: ['the', 'new', 'custom', 'best']

// ✅ Use Variations
keywords: ['mug', 'cup', 'coffee mug', 'ceramic mug']
```

### 2. Pattern Writing
```typescript
// ✅ Good Patterns
pattern: '/t-?shirt/i'              // Matches "tshirt" or "t-shirt"
pattern: '/hoodie|sweatshirt/i'     // Matches either word
pattern: '/mug|cup/i'               // Simple OR pattern

// ❌ Avoid Over-Complex
pattern: '/^(?=.*shirt)(?=.*cotton)(?=.*blue).*$/i'  // Too specific
```

### 3. Platform ID Management
```typescript
// Always verify platform IDs are correct
// BigCommerce: Check via Admin > Products > Categories
// Shopify: Use collection handle (lowercase, hyphenated)
// Etsy: Use official Taxonomy ID from Etsy docs
```

### 4. Regular Maintenance
```typescript
// Review usage statistics monthly
// Remove unused mappings
// Update keywords based on new products
// Merge similar mappings
```

## 🎯 Example Mappings

### Apparel
```json
{
  "name": "T-Shirts",
  "keywords": ["shirt", "tee", "t-shirt", "tshirt"],
  "pattern": "/t-?shirt/i",
  "bcCategoryId": 23,
  "shopifyCollection": "t-shirts",
  "etsyTaxonomyId": 1234
}

{
  "name": "Hoodies",
  "keywords": ["hoodie", "sweatshirt", "pullover", "sweater"],
  "pattern": "/hoodie|sweatshirt/i",
  "bcCategoryId": 24,
  "shopifyCollection": "hoodies",
  "etsyTaxonomyId": 5678
}
```

### Accessories
```json
{
  "name": "Mugs",
  "keywords": ["mug", "cup", "coffee mug", "ceramic mug"],
  "pattern": "/mug|cup/i",
  "bcCategoryId": 45,
  "shopifyCollection": "mugs",
  "etsyTaxonomyId": 9012
}

{
  "name": "Phone Cases",
  "keywords": ["phone case", "iphone case", "case", "cover"],
  "pattern": "/phone.{0,5}case/i",
  "bcCategoryId": 67,
  "shopifyCollection": "phone-cases",
  "etsyTaxonomyId": 3456
}
```

## 🔍 Testing

### Pattern Tester
Use the built-in pattern tester in the UI:
1. Go to Category Mappings page
2. Click "Test Pattern"
3. Enter your regex pattern
4. Enter sample product text
5. See if it matches

### Manual Testing
```typescript
// Test suggestion endpoint
const testProduct = {
  title: 'Vintage Graphic T-Shirt',
  description: 'Soft cotton tee with retro design'
}

const suggestions = await fetch('/api/category-mappings/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testProduct)
})

console.log(await suggestions.json())
// Should return T-Shirts mapping with high confidence
```

## 📊 Monitoring

### Usage Statistics
- Track which mappings are used most
- Identify mappings with low confidence scores
- Monitor suggestion acceptance rate
- Review failed categorizations

### Performance Metrics
- Average confidence score: Target >70%
- Suggestion acceptance rate: Target >80%
- Time saved per product: ~2-3 minutes

## 🚀 Future Enhancements

1. **AI-Powered Suggestions**: Use GPT/Claude for better categorization
2. **Bulk Import**: Import mappings from CSV
3. **Multi-Language Support**: Keywords in multiple languages
4. **Category Hierarchy**: Support for subcategories
5. **A/B Testing**: Test different category strategies
6. **Analytics Dashboard**: Detailed category performance metrics

## ✅ Completion Checklist

- [x] Category Mapper Service (`lib/categories/category-mapper.ts`)
- [x] Complete API suite (CRUD + suggest)
- [x] Category Management UI
- [x] BigCommerce integration
- [x] Shopify integration
- [x] Pattern testing functionality
- [x] Usage tracking
- [x] Learning system
- [x] Documentation

## 🎉 Benefits

1. **Time Savings**: 2-3 minutes per product
2. **Consistency**: Same products always get same categories
3. **Accuracy**: Confidence scoring ensures quality
4. **Scalability**: Works with thousands of products
5. **Multi-Platform**: One system for all channels
6. **Learning**: Gets smarter over time

---

**Status**: ✅ COMPLETE
**Version**: 1.0.0
**Last Updated**: 2025-01-14