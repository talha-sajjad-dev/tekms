# TikTok Export Feature

## Overview
This feature enables exporting BigCommerce products using your pre-configured TikTok template file (`tiktok_up.xlsx`). It preserves all your existing template data and only updates specific fields: product names, descriptions, and images from BigCommerce.

## Features Implemented

### 1. Template Reading
- Reads the `tiktok.xlsx` template file from your workspace
- Extracts column headers and requirements
- Identifies required fields automatically

### 2. Smart Template Preservation
- Reads your pre-configured `tiktok_up.xlsx` template
- Preserves ALL existing data and formatting
- Only updates specific fields from BigCommerce:
  - Product name → Product Title columns
  - Description → Description columns (HTML cleaned)
  - Images → All available image columns (4, 5, 9, etc.)
- All other fields (price, SKU, category, etc.) remain as configured in your template

### 3. Variant Support
- Products with modifiers (sizes, colors, etc.) are exported as separate rows
- Each variant gets its own SKU (original-variant)
- Price adjustments from modifiers are applied

### 4. Export Options
- **Export All Products**: Downloads all 1700+ products
- **Export Selected**: Export specific products (preview functionality)
- **Pagination**: Handle large product catalogs efficiently

### 5. User Interface
- **Product Grouping**: Products are grouped by base SKU
- **Single Checkbox per Product**: Each checkbox selects ALL variants at once
- **Variant Count Display**: Shows how many variants each product has
- **Expandable Variant View**: Click to see all variants and their prices
- **Search Functionality**: Filter by name, SKU, brand, or category
- **Real-time Validation**: Shows which products have images

## Files Created

### Backend
1. **`/lib/tiktok/excel-utils.ts`**
   - Excel file reading/writing utilities
   - Template parsing
   - Validation functions

2. **`/lib/tiktok/data-mapper.ts`**
   - BigCommerce to TikTok data transformation
   - Variant handling
   - HTML cleaning for descriptions

3. **`/app/api/tiktok/template/route.ts`**
   - GET: Read template structure

4. **`/app/api/tiktok/export/route.ts`**
   - GET: Preview products in TikTok format
   - POST: Generate and download Excel file

### Frontend
5. **`/app/tiktok-export/page.tsx`**
   - Main export interface
   - Product preview
   - Export controls

## How to Use

1. Navigate to "TikTok Export" in the menu
2. The page will load your products and show them in TikTok format
3. Review the product data to ensure it's mapped correctly
4. Click "Export All Products" to download the Excel file
5. The downloaded file will be in TikTok Shop's format, ready for upload

## Technical Details

### Excel Processing
- Uses `xlsx` library for Excel manipulation
- Maintains original template structure
- Preserves column order from template

### Data Transformation
- HTML tags removed from descriptions
- Character limits enforced (2000 chars for description)
- Images mapped up to 9 per product
- Variants create separate rows with unique SKUs

### Performance
- Pagination for large catalogs
- Rate limiting between API calls
- Efficient batch processing

## Next Steps (Phase 2)

1. **Individual Product Editing**
   - Edit TikTok fields before export
   - Custom field mapping
   - Save drafts

2. **Advanced Features**
   - Category mapping configuration
   - Custom export templates
   - Bulk editing
   - Export history

3. **Validation**
   - Pre-export validation
   - Missing data warnings
   - TikTok requirements checking

## Notes

- The system reads your `tiktok.xlsx` template file
- All products are fetched with images and modifiers
- Variants are automatically expanded to separate rows
- The export maintains TikTok's required format