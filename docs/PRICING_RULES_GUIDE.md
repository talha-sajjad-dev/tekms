# Pricing Rules Engine - Complete Guide

**Feature Status:** ✅ **COMPLETE**  
**Version:** 1.0.0  
**Last Updated:** 2025-01-14

---

## 🎯 Overview

The Pricing Rules Engine allows you to automate your pricing strategy across multiple sales channels. Set up dynamic pricing rules once, and they'll automatically apply when you publish products to different platforms.

### Key Benefits

- **Automate Pricing Strategy** - No manual price calculations
- **Per-Channel Markup** - Different prices for Etsy, BigCommerce, Shopify, etc.
- **Bulk Price Adjustments** - Update hundreds of products instantly
- **Rule Priority System** - Control which rules apply first
- **Real-Time Preview** - See price changes before applying

---

## 📊 Features

### 1. Five Rule Types

| Rule Type | Description | Example Use Case |
|-----------|-------------|------------------|
| **Markup Percentage** | Add X% to base price | Etsy charges 10% more to cover fees |
| **Markup Fixed** | Add fixed $ amount | Add $5 for shipping costs |
| **Set Fixed Price** | Override with specific price | Promotional pricing |
| **Round Up** | Round to .99, .95, etc. | Psychological pricing ($24.99) |
| **Round Down** | Round to whole dollars | Clean pricing ($25.00) |

### 2. Four Application Scopes

| Scope | Description | When to Use |
|-------|-------------|-------------|
| **All Products** | Applies to every product | Universal markup rules |
| **Specific Stores** | Selected stores only | Platform-specific pricing |
| **Specific Products** | Selected products only | Special product pricing |
| **Tagged Products** | Products with specific tags | Category-based pricing |

### 3. Priority System

- Rules are applied in **priority order** (highest first)
- Same priority? Applied in creation order
- Allows complex pricing strategies
- Example: Apply percentage markup first, then round up

### 4. Platform-Specific Overrides

Each rule can have different values per platform:
```json
{
  "platformRules": {
    "ETSY": { "type": "markup_percent", "value": 15 },
    "BIGCOMMERCE": { "type": "markup_percent", "value": 5 }
  }
}
```

---

## 🚀 Quick Start

### Step 1: Create Your First Rule

1. Navigate to **Pricing Rules** page
2. Click **Create Rule**
3. Fill in details:
   ```
   Name: Etsy +10% Markup
   Rule Type: Markup Percentage
   Value: 10
   Applies To: Specific Stores
   Select Store: [Your Etsy Store]
   Priority: 100
   Active: ✓
   ```
4. Click **Create Rule**

### Step 2: Test with Calculator

1. Click **Price Calculator** button
2. Enter a base price: `$29.99`
3. Click **Calculate Price**
4. See the result: `$32.99` (29.99 + 10%)

### Step 3: Publish Products

When you publish a product to Etsy, the pricing rule automatically applies!

**Before:**  
Base Price: $29.99

**After Publishing to Etsy:**  
Published Price: $32.99 ✨

---

## 📖 Usage Examples

### Example 1: Platform-Specific Markup

**Goal:** Charge 10% more on Etsy, 5% more on Shopify

**Rule 1:**
```
Name: Etsy Markup
Type: Markup Percentage
Value: 10
Applies To: Specific Stores
Stores: [Etsy Store]
Priority: 100
```

**Rule 2:**
```
Name: Shopify Markup
Type: Markup Percentage
Value: 5
Applies To: Specific Stores
Stores: [Shopify Store]
Priority: 100
```

**Result:**
- Product base price: $29.99
- Etsy price: $32.99
- Shopify price: $31.49
- BigCommerce price: $29.99 (no markup)

---

### Example 2: Psychological Pricing

**Goal:** All prices end in .99

**Rule:**
```
Name: Round to .99
Type: Round Up
Value: 0.99
Applies To: All Products
Priority: 0 (applies last)
```

**Result:**
- $29.50 → $29.99
- $31.20 → $31.99
- $44.75 → $44.99

---

### Example 3: Premium Products

**Goal:** Premium tagged products get $10 markup

**Rule:**
```
Name: Premium Markup
Type: Markup Fixed
Value: 10
Applies To: Tagged Products
Tags: premium, luxury, exclusive
Priority: 200
```

**Result:**
- Regular product ($29.99) → $29.99
- Premium product ($29.99) → $39.99

---

### Example 4: Complex Pricing Strategy

**Multiple Rules Working Together:**

```
Rule 1 (Priority 300):
  Name: Premium Products
  Type: Markup Fixed
  Value: 15
  Applies To: Tagged "premium"

Rule 2 (Priority 200):
  Name: Etsy Fee Coverage
  Type: Markup Percentage
  Value: 12
  Applies To: Specific Stores [Etsy]

Rule 3 (Priority 100):
  Name: Psychological Pricing
  Type: Round Up
  Value: 0.99
  Applies To: All
```

**Calculation for Premium Product on Etsy:**
```
Step 1: Base Price:         $50.00
Step 2: + Premium ($15):    $65.00
Step 3: + Etsy 12%:         $72.80
Step 4: Round to .99:       $72.99
Final Price:                $72.99
```

---

## 🛠️ API Reference

### List Pricing Rules
```bash
GET /api/pricing-rules
```

**Query Parameters:**
- `isActive` - Filter by active status (true/false)
- `appliesTo` - Filter by scope (all/specific_stores/specific_products/tagged)

**Response:**
```json
{
  "success": true,
  "rules": [...],
  "count": 5
}
```

---

### Create Pricing Rule
```bash
POST /api/pricing-rules
```

**Request Body:**
```json
{
  "name": "Etsy +10% Markup",
  "description": "Cover Etsy fees and payment processing",
  "appliesTo": "specific_stores",
  "storeIds": ["store-123"],
  "ruleType": "markup_percent",
  "value": 10,
  "isActive": true,
  "priority": 100
}
```

**Response:**
```json
{
  "success": true,
  "rule": {
    "id": "rule-456",
    "name": "Etsy +10% Markup",
    ...
  }
}
```

---

### Calculate Price Preview
```bash
POST /api/pricing-rules/calculate
```

**Request Body:**
```json
{
  "basePrice": 29.99,
  "productId": "prod-123",
  "tags": ["t-shirt", "cotton"],
  "storeId": "store-456",
  "platform": "ETSY"
}
```

**Response:**
```json
{
  "success": true,
  "calculation": {
    "originalPrice": 29.99,
    "finalPrice": 32.99,
    "appliedRules": [
      {
        "ruleId": "rule-789",
        "ruleName": "Etsy +10% Markup",
        "ruleType": "markup_percent",
        "value": 10,
        "priceAfter": 32.99
      }
    ],
    "breakdown": [
      "Base price: $29.99",
      "Etsy +10% Markup: $29.99 → $32.99"
    ]
  }
}
```

---

### Apply Rule to Products
```bash
POST /api/pricing-rules/[ruleId]/apply
```

**Request Body:**
```json
{
  "productIds": ["prod-1", "prod-2", "prod-3"],
  "dryRun": false
}
```

**Response:**
```json
{
  "success": true,
  "dryRun": false,
  "applied": true,
  "results": [
    {
      "productId": "prod-1",
      "productTitle": "Cool T-Shirt",
      "currentPrice": 29.99,
      "newPrice": 32.99,
      "difference": 3.00
    }
  ],
  "summary": {
    "totalProducts": 3,
    "averageIncrease": 3.15,
    "totalRevenueDelta": 9.45
  }
}
```

---

## 💡 Best Practices

### 1. Use Descriptive Names
❌ Bad: "Rule 1", "Test"  
✅ Good: "Etsy +10% Markup", "Premium Products +$15"

### 2. Set Appropriate Priorities
```
300-399: Product-specific rules (highest)
200-299: Category/tag rules
100-199: Platform-specific rules
0-99:    Universal rules (lowest)
```

### 3. Test Before Applying
Always use the **Price Calculator** or `dryRun: true` before applying rules to products.

### 4. Start Simple
Begin with one or two rules, then add complexity as needed.

### 5. Document Your Strategy
Add descriptions to your rules explaining why they exist.

---

## ⚠️ Common Pitfalls

### Pitfall 1: Rule Conflicts
**Problem:** Multiple rules fighting each other  
**Solution:** Use priorities correctly, higher priority wins

### Pitfall 2: Forgetting to Activate
**Problem:** Created rule but it doesn't apply  
**Solution:** Check the "Active" toggle is ON

### Pitfall 3: Wrong Application Scope
**Problem:** Rule not applying to expected products  
**Solution:** Double-check appliesTo setting and selected stores/products/tags

### Pitfall 4: Decimal Precision
**Problem:** Prices like $29.9999999  
**Solution:** Use round_up or round_down rules to clean prices

---

## 🔧 Advanced Features

### Platform-Specific Rules

Override rule behavior per platform:

```javascript
// API Request
{
  "name": "Universal Markup",
  "ruleType": "markup_percent",
  "value": 5, // default for all platforms
  "platformRules": {
    "ETSY": {
      "type": "markup_percent",
      "value": 15  // Etsy gets 15% instead
    },
    "TIKTOK": {
      "type": "markup_fixed",
      "value": 10  // TikTok gets +$10 instead
    }
  }
}
```

### Combine Multiple Rule Types

Example: Markup + Round
```
Priority 200: Markup 12%
Priority 100: Round to .99
Result: $50 → $56 → $55.99
```

### Tag-Based Category Pricing

```
Tag "basic" → No markup
Tag "premium" → +$10 markup
Tag "luxury" → +$25 markup
```

---

## 📈 Analytics & Monitoring

### Track Rule Impact

Use the calculation results to monitor:
- Average price increase per rule
- Total revenue impact
- Products affected count
- Rule application success rate

### Audit Trail

All price changes are logged in the `ChangeLog` table:
```sql
SELECT * FROM "ChangeLog"
WHERE entityType = 'product'
AND field = 'price'
ORDER BY createdAt DESC
```

---

## 🚦 Integration with Publishing

### Automatic Application

Pricing rules **automatically apply** when:
1. Publishing products to channels
2. Updating existing channel listings
3. Bulk publishing operations

### Manual Application

You can also manually apply rules to existing products:
1. Select products in product list
2. Choose pricing rule
3. Preview changes
4. Apply to update base prices

---

## 🔮 Future Enhancements

### Coming Soon:
- [ ] Time-based rules (seasonal pricing)
- [ ] Quantity-based discounts
- [ ] Competitor price matching
- [ ] A/B pricing tests
- [ ] Rule scheduling
- [ ] Advanced analytics dashboard

---

## 🆘 Troubleshooting

### Rule Not Applying

**Check:**
1. Is rule active? (toggle switch)
2. Does scope match? (appliesTo setting)
3. Is store/product selected correctly?
4. Are there conflicting rules with higher priority?

### Unexpected Prices

**Debug:**
1. Use Price Calculator to see which rules apply
2. Check rule priority order
3. Review platformRules overrides
4. Verify base price is correct

### Performance Issues

**If slow:**
1. Reduce number of active rules
2. Use specific scopes instead of "all"
3. Avoid processing thousands of products at once
4. Consider batching bulk operations

---

## 📞 Support

### Need Help?

1. Check this documentation
2. Review API examples
3. Test with Price Calculator
4. Contact support with:
   - Rule configuration
   - Expected vs actual prices
   - Product/store IDs

---

## ✅ Quick Reference Card

| Task | Action |
|------|--------|
| **Create rule** | Pricing Rules → Create Rule |
| **Test pricing** | Price Calculator button |
| **Apply to products** | Select products → Apply Rule |
| **Edit rule** | Click pencil icon |
| **Disable rule** | Toggle Active switch OFF |
| **Check if working** | Publish test product |
| **Debug pricing** | Use Price Calculator |
| **Bulk update** | API: `/api/pricing-rules/[id]/apply` |

---

**Congratulations!** 🎉 You now have a powerful automated pricing engine. Happy selling!