# TikTok Direct Integration - API Documentation Needed

This document outlines the API documentation requirements needed to complete the BigCommerce to TikTok Shop direct integration.

## ✅ BigCommerce API - Already Configured

The BigCommerce API integration is already set up and working:
- **Store Hash**: Configured in environment variables
- **Access Token**: Configured in environment variables
- **Base URL**: `https://api.bigcommerce.com/stores/{store_hash}/v3/`
- **Product Fetching**: ✅ Working
- **Authentication**: ✅ Working

## 📋 Required: TikTok Shop API Documentation

Please provide the following TikTok Shop API documentation:

#### Product Creation/Update Endpoints
- [ ] POST/PUT product creation endpoint
- [ ] Required product fields
- [ ] Optional product fields
- [ ] Product data structure
- [ ] Image upload process
- [ ] Category mapping
- [ ] Pricing structure
- [ ] Inventory management
- [ ] Rate limiting rules
- [ ] Authentication (OAuth, API keys, etc.)
- [ ] Error codes and handling

#### Required Information:
```
Base URL: ?
Authentication Method: ?
API Version: ?
Rate Limits: ?
Product Size Limits: ?
Image Requirements: ?
```

### 2. Field Mapping Requirements

BigCommerce fields available (from existing API):
- `id` - Product ID
- `name` - Product name
- `description` - Product description
- `price` - Product price
- `sku` - Product SKU
- `weight` - Product weight
- `images` - Array of image objects
- `categories` - Category IDs
- `variants` - Product variants/options
- `inventory_level` - Stock level
- `is_visible` - Visibility status

Please specify how these should map to TikTok fields:

#### Product Information
- BigCommerce `name` → TikTok `?`
- BigCommerce `description` → TikTok `?`
- BigCommerce `price` → TikTok `?`
- BigCommerce `sku` → TikTok `?`
- BigCommerce `weight` → TikTok `?`
- BigCommerce `categories` → TikTok `?`

#### Images
- BigCommerce `images` → TikTok `?`
- Image URL handling: ?
- Image upload method: ?
- Max images per product: ?

#### Variants/Options
- BigCommerce `variants` → TikTok `?`
- Size handling: ?
- Color handling: ?
- Custom attributes: ?

### 3. Business Rules & Restrictions

Please specify any business rules or restrictions:

#### TikTok Requirements
- [ ] Product title character limits
- [ ] Description character limits
- [ ] Category restrictions
- [ ] Pricing restrictions
- [ ] Image size/format requirements
- [ ] Prohibited products/categories
- [ ] Shipping requirements
- [ ] Return policy requirements

#### Sync Rules
- [ ] Which products should be synced?
- [ ] How often to sync?
- [ ] Handle out of stock products?
- [ ] Price markup rules?
- [ ] Inventory sync strategy?

### 4. Error Handling

Please provide information on:
- [ ] Common error codes and messages
- [ ] Retry logic requirements
- [ ] Failed product handling
- [ ] Conflict resolution (product already exists)

### 5. OAuth/Authentication Flow

If OAuth is required:
- [ ] OAuth endpoints
- [ ] Scope requirements
- [ ] Token refresh process
- [ ] Token storage requirements

## How to Provide Documentation

1. **Copy and paste** the official API documentation from:
   - TikTok Shop Partner Center / Developer Portal

2. **Include**:
   - API endpoint URLs
   - Request/response examples
   - Authentication details
   - Rate limits
   - Error codes
   - Field definitions

3. **Paste** the documentation in the "API Documentation" section on the TikTok Direct page

## Implementation Checklist

✅ **Completed:**
- [x] BigCommerce API integration
- [x] BigCommerce product fetching
- [x] API configuration UI
- [x] Connection testing framework

**Pending (requires TikTok API documentation):**
- [ ] Data transformation layer (BigCommerce → TikTok format)
- [ ] TikTok product creation
- [ ] Image upload handling
- [ ] Category mapping
- [ ] Variant/option handling
- [ ] Error handling & logging
- [ ] Rate limiting & retry logic
- [ ] Sync status tracking
- [ ] OAuth flow (if needed)
- [ ] Webhook integration (if available)

## Notes

- All sensitive API keys should be stored in environment variables
- The integration will include proper error handling and logging
- Rate limiting will be implemented to comply with both APIs
- Progress tracking will be shown in the UI