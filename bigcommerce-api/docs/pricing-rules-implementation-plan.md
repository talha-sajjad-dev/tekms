# Pricing Rules Implementation Plan

## Step 1: Check Current Product Count
First, we need to determine how many products you have and which ones need pricing rules updated.

## Step 2: Enhance Existing Pricing Rules System
Modify [`app/api/bigcommerce/catalog/update-pricing-rules/route.ts`](app/api/bigcommerce/catalog/update-pricing-rules/route.ts) to:

### A. Add Force Update Mode
```typescript
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const forceUpdate = searchParams.get("force") === "true"
  
  // Rest of existing code...
}
```

### B. Remove Conditional Check
**Change this**:
```typescript
if (currentAdjuster !== priceAdjustment) {
  console.log(`💰 Updating price adjuster for "${value.label}": $${currentAdjuster || 0} → $${priceAdjustment}`)
  // Update logic...
}
```

**To this**:
```typescript
if (priceAdjustment !== null) {
  if (forceUpdate) {
    console.log(`🔄 FORCE UPDATE: "${value.label}" → $${priceAdjustment}`)
  } else if (currentAdjuster !== priceAdjustment) {
    console.log(`💰 REGULAR UPDATE: "${value.label}": $${currentAdjuster || 0} → $${priceAdjustment}`)
  } else {
    console.log(`✓ Already correct: "${value.label}": $${priceAdjustment}`)
    continue // Skip if not forcing and already correct
  }
  
  // Apply update regardless of current state when force=true
  const updateResult = await updateModifierValue(product.id, modifier.id, value.id, {
    ...value,
    adjusters: {
      price: {
        adjuster: "relative",
        adjuster_value: priceAdjustment
      }
    }
  })
}
```

### C. Enhanced Progress Tracking
```typescript
let totalProductsProcessed = 0
let productsWithModifiers = 0
let modifiersUpdated = 0
let forceUpdates = 0
let regularUpdates = 0

// In the processing loop
console.log(`📊 Progress: ${totalProductsProcessed}/${products.length} products processed`)
console.log(`📈 Stats: ${productsWithModifiers} with modifiers, ${modifiersUpdated} modifiers updated`)
```

## Step 3: Create Analysis Endpoint
Add a GET endpoint to analyze current state:

```typescript
export async function GET() {
  const products = await getAllProducts()
  
  let productsWithTargetModifiers = 0
  let modifiersNeedingPricing = 0
  
  for (const product of products) {
    const modifiers = await getProductModifiers(product.id)
    
    for (const modifier of modifiers) {
      if (modifier.display_name === "Shirt Size" || modifier.display_name === "Shirt Style") {
        productsWithTargetModifiers++
        
        const values = await getModifierValues(product.id, modifier.id)
        for (const value of values) {
          const priceRule = getPriceAdjuster(modifier.display_name, value.label)
          if (priceRule !== null) {
            modifiersNeedingPricing++
          }
        }
        break
      }
    }
  }
  
  return NextResponse.json({
    totalProducts: products.length,
    productsWithTargetModifiers,
    modifiersNeedingPricing,
    estimatedApiCalls: modifiersNeedingPricing * 3, // Get + Check + Update
    estimatedTimeHours: Math.ceil((modifiersNeedingPricing * 3) / 3600) // 1 call per second
  })
}
```

## Step 4: Usage Instructions

### Analysis (Check Current State)
```bash
GET /api/bigcommerce/catalog/update-pricing-rules
```

### Regular Update (Only Missing Pricing)
```bash
POST /api/bigcommerce/catalog/update-pricing-rules
```

### Force Update (ALL Products)
```bash
POST /api/bigcommerce/catalog/update-pricing-rules?force=true
```

## Step 5: Expected Results

### Analysis Response
```json
{
  "totalProducts": 1234,
  "productsWithTargetModifiers": 856,
  "modifiersNeedingPricing": 2568,
  "estimatedApiCalls": 7704,
  "estimatedTimeHours": 3
}
```

### Update Response
```json
{
  "success": true,
  "summary": {
    "totalProducts": 1234,
    "productsProcessed": 856,
    "modifiersUpdated": 2568,
    "forceUpdates": 1200,
    "regularUpdates": 1368
  }
}
```

## Implementation Steps

1. **Check Product Count**: Use analysis endpoint to see current state
2. **Test Small Batch**: Run force update on 10-20 products first
3. **Full Catalog Update**: Run force update on all products
4. **Monitor Progress**: Watch logs for completion status

This plan will update pricing rules on ALL your products with Shirt Size and Shirt Style modifiers, regardless of their current pricing state.