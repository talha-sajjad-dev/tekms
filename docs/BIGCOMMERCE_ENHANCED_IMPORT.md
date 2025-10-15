# 🚀 BigCommerce Enhanced Product Import

## Overview

This document describes the enhanced BigCommerce product import system that captures **complete product data** including variants, modifiers, options, full images, and all metadata needed for cross-platform publishing to Etsy, TikTok, and other marketplaces.

---

## 🎯 Problem Solved

### **Before (Limited Data Capture)**
When importing from BigCommerce, the system only captured:
- ✅ Basic product info (name, price, SKU)
- ✅ Simple description
- ✅ Basic images array
- ❌ **Missing:** Variants with full details
- ❌ **Missing:** Product modifiers
- ❌ **Missing:** Option sets
- ❌ **Missing:** Full image metadata
- ❌ **Missing:** Brand information
- ❌ **Missing:** Custom fields
- ❌ **Missing:** Physical dimensions

**Result:** Insufficient data to publish to Etsy/TikTok which require complete product information.

### **After (Complete Data Capture)**
Now captures **everything** from BigCommerce:
- ✅ Complete variant information with SKUs, prices, option values
- ✅ Product modifiers (text fields, checkboxes, date pickers)
- ✅ Option sets (Color, Size, Material combinations)
- ✅ All images with full metadata (URLs, descriptions, sort order)
- ✅ Brand name and ID
- ✅ Custom fields
- ✅ Physical dimensions (weight, width, height, depth)
- ✅ Inventory tracking details
- ✅ Product type and condition
- ✅ Availability status

**Result:** Complete product data ready for cross-platform publishing!

---

## 📊 Data Structure

### **Product Data Schema**

```typescript
{
  // Basic Info
  name: string
  description: string
  sku: string
  price: number
  compareAtPrice: number
  
  // Images with Full Metadata
  images: {
    images: [
      {
        id: number
        product_id: number
        image_url: string
        url_zoom: string
        url_standard: string
        url_thumbnail: string
        is_thumbnail: boolean
        sort_order: number
        description: string
      }
    ],
    primary_image: { /* same structure */ }
  }
  
  // Complete Variants
  variants: {
    variants: [
      {
        id: number
        product_id: number
        sku: string
        price: number
        sale_price: number
        retail_price: number
        weight: number
        width: number
        height: number
        depth: number
        is_free_shipping: boolean
        fixed_cost_shipping_price: number
        purchasing_disabled: boolean
        inventory_level: number
        inventory_warning_level: number
        bin_picking_number: string
        option_values: [
          {
            id: number
            label: string
            option_id: number
            option_display_name: string
          }
        ]
      }
    ],
    has_variants: boolean
  }
  
  // Custom Fields & Modifiers
  customFields: {
    custom_fields: [
      {
        id: number
        name: string
        value: string
      }
    ],
    modifiers: [
      {
        id: number
        product_id: number
        name: string
        display_name: string
        type: string // 'text', 'checkbox', 'date', 'file', etc.
        required: boolean
        sort_order: number
        config: {
          default_value?: string
          checked_by_default?: boolean
          checkbox_label?: string
          date_limited?: boolean
          date_limit_mode?: string
          date_earliest_value?: string
          date_latest_value?: string
          file_types_mode?: string
          file_types_supported?: string[]
          file_types_other?: string[]
          file_max_size?: number
          text_characters_limited?: boolean
          text_min_length?: number
          text_max_length?: number
          text_lines_limited?: boolean
          text_max_lines?: number
          number_limited?: boolean
          number_limit_mode?: string
          number_lowest_value?: number
          number_highest_value?: number
          number_integers_only?: boolean
          product_list_adjusts_inventory?: boolean
          product_list_adjusts_pricing?: boolean
          product_list_shipping_calc?: string
        }
        option_values?: [
          {
            id: number
            option_id: number
            label: string
            sort_order: number
            value_data?: any
            is_default?: boolean
            adjusters?: {
              price?: { adjuster: string, adjuster_value: number }
              weight?: { adjuster: string, adjuster_value: number }
              image_url?: string
              purchasing_disabled?: { status: boolean, message: string }
            }
          }
        ]
      }
    ],
    options: [
      {
        id: number
        product_id: number
        name: string
        display_name: string
        type: string // 'radio_buttons', 'rectangles', 'dropdown', 'swatch'
        sort_order: number
        config: {
          default_value?: string
          checked_by_default?: boolean
          product_list_adjusts_inventory?: boolean
          product_list_adjusts_pricing?: boolean
        }
        option_values: [
          {
            id: number
            label: string
            sort_order: number
            value_data?: { colors: string[] }
            is_default: boolean
          }
        ]
      }
    ],
    brand_id: number
    brand_name: string
    weight: number
    width: number
    height: number
    depth: number
    condition: string
    type: string
    availability: string
    inventory_level: number
    inventory_tracking: string
  }
  
  // Platform Data (Complete BigCommerce Response)
  platformData: { /* Full BigCommerce product object */ }
}
```

---

## 🔄 How It Works

### **1. Initial Product Fetch**
```typescript
// Fetch products with ALL includes
GET /stores/{storeHash}/v3/catalog/products
  ?limit=250
  &page=1
  &include=images,variants,custom_fields,bulk_pricing_rules,primary_image,modifiers,options
```

### **2. Data Enrichment**
For each product, the system makes additional API calls to get complete data:

```typescript
// Get full variant details
GET /stores/{storeHash}/v3/catalog/products/{productId}/variants

// Get product modifiers
GET /stores/{storeHash}/v3/catalog/products/{productId}/modifiers

// Get product options
GET /stores/{storeHash}/v3/catalog/products/{productId}/options

// Get all images with metadata
GET /stores/{storeHash}/v3/catalog/products/{productId}/images

// Get brand information (if brand_id exists)
GET /stores/{storeHash}/v3/catalog/brands/{brandId}
```

### **3. Database Storage**
All data is saved to the [`Product`](prisma/schema.prisma:349) table:
- `platformData`: Complete BigCommerce product object
- `images`: Full image metadata
- `variants`: Complete variant information
- `customFields`: Modifiers, options, dimensions, brand

---

## 📥 Usage

### **Trigger Enhanced Import**

```bash
# Via API
POST /api/stores/{storeId}/sync
Content-Type: application/json

{
  "background": false  # Set to true for large imports
}
```

### **Monitor Progress**

The system provides detailed logging:

```
🔄 Starting BigCommerce product sync for store: My Store
📦 Fetching products page 1...
✓ Fetched 250 products (Total: 250)
📦 Fetching products page 2...
✓ Fetched 150 products (Total: 400)
📊 Total products fetched: 400
🔍 Enriching 400 products with detailed data...
✅ Enriched 400 products with detailed data
💾 Saving products to database in batches of 50...
✓ Created product 123: Rhinestone T-Shirt
✓ Created product 124: Custom Hoodie
✓ Processed batch 1/8 (50 synced, 0 failed)
...
✅ Sync complete! 400 products synced successfully
```

---

## 🎨 Cross-Platform Publishing Benefits

With complete BigCommerce data, you can now:

### **→ Publish to Etsy**
- ✅ Map BigCommerce variants to Etsy variations
- ✅ Use modifiers for Etsy personalization options
- ✅ Transfer all images with proper metadata
- ✅ Include materials, dimensions for Etsy requirements
- ✅ Map options to Etsy attributes

### **→ Publish to TikTok**
- ✅ Convert variants to TikTok SKUs
- ✅ Use full image set for TikTok product showcase
- ✅ Include brand information
- ✅ Transfer weight/dimensions for shipping
- ✅ Map categories and attributes

### **→ Publish to Shopify**
- ✅ Complete variant mapping with options
- ✅ Transfer modifiers as product options
- ✅ Full image synchronization
- ✅ Brand and collection mapping

---

## 🔧 Implementation Details

### **Files Modified**

1. **[`app/api/stores/[id]/sync/route.ts`](app/api/stores/[id]/sync/route.ts:466)**
   - Enhanced `syncBigCommerceProducts()` function
   - Added `enrichBigCommerceProducts()` helper
   - Captures complete product data structure

### **Key Functions**

#### `enrichBigCommerceProducts()`
Located at line 466, this function:
- Takes basic product data
- Makes API calls for variants, modifiers, options
- Fetches complete image metadata
- Retrieves brand information
- Returns fully enriched product objects

#### Enhanced Product Data Mapping
Located at line 538, this section:
- Builds comprehensive `customFields` object
- Includes modifiers, options, dimensions
- Stores brand name and inventory details
- Preserves all platform-specific data

---

## 📋 Next Steps

### **1. Cross-Platform Transformation Layer**

Create transformation functions to convert BigCommerce data to platform-specific formats:

```typescript
// lib/transformers/bigcommerce-to-etsy.ts
export function transformBigCommerceToEtsy(bcProduct: Product) {
  return {
    title: bcProduct.name,
    description: bcProduct.description,
    price: bcProduct.price,
    // Map variants to Etsy variations
    variations: transformVariantsToEtsy(bcProduct.variants),
    // Map modifiers to personalization options
    personalization: transformModifiersToPersonalization(bcProduct.customFields.modifiers),
    // Map images
    images: bcProduct.images.images.map(img => img.url_standard),
    // etc.
  }
}
```

### **2. Publisher Enhancements**

Update platform publishers to use enriched data:

```typescript
// lib/publishers/etsy-publisher.ts
export async function publishToEtsy(productId: string) {
  const product = await db.product.findUnique({ where: { id: productId } })
  const etsyData = transformBigCommerceToEtsy(product)
  // Publish to Etsy API
}
```

### **3. UI Enhancements**

Display complete product information in the product editor:
- Show all variants with options
- Display modifiers
- Preview all images
- Show brand and dimensions
- Enable editing before publishing

---

## ✅ Testing

### **Verify Complete Data Import**

1. Connect a BigCommerce store
2. Sync products
3. Check database for complete data:

```typescript
const product = await db.product.findFirst({
  where: { platform: 'BIGCOMMERCE' }
})

console.log('Variants:', product.variants)
console.log('Modifiers:', product.customFields.modifiers)
console.log('Options:', product.customFields.options)
console.log('Images:', product.images.images)
console.log('Brand:', product.customFields.brand_name)
```

### **Expected Results**

- ✅ All product variants captured
- ✅ Modifiers array populated (if product has modifiers)
- ✅ Options array populated (if product has option sets)
- ✅ Complete image metadata
- ✅ Brand name retrieved (if product has brand)
- ✅ Physical dimensions stored

---

## 🚀 Performance Considerations

### **Rate Limiting**
- Uses [`rateLimitedFetch()`](lib/bigcommerce/rate-limiter.ts) for all API calls
- Respects BigCommerce API rate limits
- Automatically retries on rate limit errors

### **Batch Processing**
- Products processed in batches of 50
- Progress tracking in database
- Can run in background for large catalogs

### **Error Handling**
- Individual product failures don't stop sync
- Errors logged for review
- Failed products can be retried

---

## 📝 Summary

The enhanced BigCommerce import now captures **complete product data** including:

- ✅ Full variant details with SKUs and prices
- ✅ Product modifiers for customization
- ✅ Option sets for variations
- ✅ Complete image metadata
- ✅ Brand information
- ✅ Physical dimensions
- ✅ Inventory details
- ✅ Custom fields

This provides **everything needed** to publish products to Etsy, TikTok, Shopify, and other platforms with complete, accurate product information!

---

**Status:** ✅ Implemented
**Version:** 1.0.0
**Date:** 2025-10-14
**Impact:** High - Enables full cross-platform product publishing