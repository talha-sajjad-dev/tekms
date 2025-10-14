# POD Platform Workflow Guide

## How All Features Work Together

### 🎯 The Complete POD Workflow

```
1. Create Template (Optional but Recommended)
   ↓
2. Create Product (with Template or from Scratch)
   ↓
3. Auto-Apply Category Mappings (Based on Keywords)
   ↓
4. Auto-Apply Pricing Rules (Per Platform)
   ↓
5. Publish to Selected Platforms
   ↓
6. Products Listed with Correct Prices & Categories
```

---

## 1. 📋 Templates: Bulk Product Creation

### Purpose
Create reusable product templates for POD items (T-shirts, hoodies, etc.) to generate dozens of variants instantly.

### How It Works

**Step 1: Create a Template**
```
Templates Modal → Create Template
- Name: "Basic T-Shirt"
- Base Price: $24.99
- Variant Options:
  * Size: S, M, L, XL, 2XL
  * Color: Black, White, Red, Blue
- Price by Size:
  * S: +$0
  * M: +$2
  * L: +$4
  * XL: +$6
  * 2XL: +$8
```

**Step 2: Use Template in Product Creation**
```
Create Product Modal → "Use Template" button
- Select "Basic T-Shirt" template
- System auto-generates: 5 sizes × 4 colors = 20 variants
- Each variant gets correct pricing:
  * BASIC-TSHIRT-S-BLACK: $24.99
  * BASIC-TSHIRT-M-BLACK: $26.99
  * BASIC-TSHIRT-L-BLACK: $28.99
  * etc.
```

**Result**: Create 20+ product variants in seconds instead of manually creating each one.

---

## 2. 💰 Pricing Rules: Automatic Per-Platform Pricing

### Purpose
Automatically adjust prices for different platforms (Etsy charges fees, BigCommerce doesn't, etc.)

### How It Works

**Step 1: Create Pricing Rules**
```
Pricing Rules Modal → Create Rule

Rule 1: "Etsy Markup"
- Applies to: All Products
- Rule Type: Markup Percentage
- Value: 10%
- Priority: 1
- Active: Yes

Rule 2: "Shopify Premium"
- Applies to: Tagged Products (tag: "premium")
- Rule Type: Markup Percentage  
- Value: 15%
- Priority: 2
- Active: Yes
```

**Step 2: Create & Publish Product**
```
Product: "Custom T-Shirt"
Base Price: $25.00
Tags: premium

When Publishing:
- BigCommerce → $25.00 (no rules apply)
- Etsy → $27.50 (10% markup = +$2.50)
- Shopify → $28.75 (10% + 15% = +$3.75)
```

**Result**: Same product shows correct prices on each platform automatically.

---

## 3. 🏷️ Category Mappings: Auto-Categorization

### Purpose
Automatically map products to correct categories on each platform based on keywords in title/description.

### How It Works

**Step 1: Create Category Mappings**
```
Category Mappings Modal → Create Mapping

Mapping 1: "T-Shirts"
- Keywords: shirt, tee, t-shirt, tshirt
- BigCommerce Category ID: 23
- Shopify Collection: "t-shirts"
- Etsy Taxonomy ID: 1234
```

**Step 2: Create Product**
```
Product Title: "Custom Print T-Shirt"
Description: "Premium cotton tee..."

System Detects:
- "t-shirt" matches "T-Shirts" mapping
- "tee" matches "T-Shirts" mapping

Auto-Applies Categories:
- BigCommerce → Category 23
- Shopify → Collection "t-shirts"
- Etsy → Taxonomy 1234
```

**Result**: Products automatically appear in correct categories on each platform.

---

## 🔄 Complete Example Workflow

### Scenario: Selling Custom POD T-Shirts

**1. One-Time Setup (5 minutes)**
```
A. Create Template:
   - Name: "Basic Tee"
   - Sizes: S-2XL (5 sizes)
   - Colors: 6 colors
   - Price by size configured

B. Create Pricing Rules:
   - Etsy: +10% (covers fees)
   - Shopify: +5% (covers transaction fees)

C. Create Category Mapping:
   - Keywords: shirt, tee, t-shirt
   - Platform category IDs configured
```

**2. Daily Product Creation (30 seconds per design)**
```
A. Open Products → Click "Create"

B. Use "Basic Tee" Template:
   - System generates 30 variants (5 sizes × 6 colors)
   - All SKUs auto-generated
   - All prices calculated

C. Add Your Details:
   - Title: "Funny Cat T-Shirt"
   - Description: "Cute cat design tee..."
   - Upload design image

D. Click "Save & Publish"
   - Select: Etsy + Shopify + BigCommerce
   
E. System Automatically:
   - Applies Etsy +10% markup
   - Applies Shopify +5% markup
   - Maps to T-Shirt categories on all platforms
   - Creates 30 variants on each platform
   - Total: 90 products created (30 variants × 3 platforms)
```

**Result**: 90 products live in 30 seconds with correct pricing and categories!

---

## 📊 What Happens Behind the Scenes

### When You Click "Save & Publish"

```javascript
1. Validate Product Data
   ✓ Title, SKU, Price required

2. Apply Category Mappings
   ✓ Analyze title/description for keywords
   ✓ Find matching category mappings
   ✓ Attach platform-specific category IDs

3. Calculate Prices Per Platform
   ✓ Start with base price
   ✓ Apply all active pricing rules in priority order
   ✓ Round according to rules

4. Transform for Each Platform
   ✓ Convert to BigCommerce format
   ✓ Convert to Shopify format
   ✓ Convert to Etsy format

5. Create Products via APIs
   ✓ Send to each platform
   ✓ Store channel listing IDs
   ✓ Map variants between systems

6. Done!
   ✓ Products live on all platforms
   ✓ Prices optimized per platform
   ✓ Categories correct everywhere
```

---

## 💡 Best Practices

### For Templates
- Create one template per product type (T-Shirt, Hoodie, Mug, etc.)
- Use size-based pricing for apparel
- Keep variant options consistent (always same sizes/colors)

### For Pricing Rules
- Lower priority = applies first
- Stack rules for compound effects
- Test with calculator before activating
- Create platform-specific rules (one per marketplace)

### For Category Mappings
- Use common keywords (shirt, tee, t-shirt all map to same category)
- Get platform category IDs from each marketplace
- Test mapping with sample product titles
- Create mappings for your top 5-10 product types

---

## 🚀 Quick Start Checklist

- [ ] **Templates**: Create 2-3 templates for your main products
- [ ] **Pricing Rules**: Set up per-platform markup rules
- [ ] **Category Mappings**: Map your top 5 product categories
- [ ] **Test Product**: Create one test product using template
- [ ] **Verify**: Check prices and categories on each platform
- [ ] **Go Live**: Start creating products at scale!

---

## ❓ FAQ

**Q: Do I need to create templates?**
A: No, but they save massive time for products with many variants.

**Q: Can I change pricing rules after products are published?**
A: Rules only apply at publish time. Update products to apply new rules.

**Q: What if I don't set up category mappings?**
A: Products will publish but won't be categorized (shows under "Uncategorized").

**Q: Can I have multiple pricing rules?**
A: Yes! Rules stack in priority order (lower number = applies first).

**Q: How do I test if my rules work?**
A: Use the "Calculator" in Pricing Rules to preview calculations.

---

## 📝 Current Implementation Status

✅ **Fully Implemented:**
- Template CRUD operations
- Pricing Rules CRUD operations
- Category Mappings CRUD operations
- Product creation with variants
- Multi-platform publishing

⚠️ **Needs Integration (In Progress):**
- Auto-apply templates in product creation
- Auto-apply pricing rules during publishing
- Auto-suggest categories based on keywords
- Show user which rules/mappings applied

🔄 **Next Steps:**
1. Integrate template selection in CreateProductModal
2. Apply pricing engine during product publishing
3. Auto-run category mapper on product save
4. Add visual indicators showing applied rules/mappings