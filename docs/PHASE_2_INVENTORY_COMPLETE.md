# Phase 2.3: Inventory Sync System - COMPLETE ✅

## Overview
Real-time inventory management and synchronization across all platforms has been successfully implemented. The system prevents overselling, maintains stock accuracy, and provides automated inventory syncing to BigCommerce and Shopify.

## Components Implemented

### 1. Inventory Service (`lib/inventory/inventory-service.ts`)
Core service handling all inventory operations:

**Key Features:**
- Calculate available inventory (total - allocated)
- Allocate inventory to specific channels
- Manual inventory adjustments with change logging
- Sync inventory to BigCommerce
- Sync inventory to Shopify
- Bulk sync to all channels
- Low stock detection and alerts
- Support for both simple products and variants

**Main Methods:**
```typescript
InventoryService.getInventoryStatus(masterProductId, masterVariantId, userId)
InventoryService.adjustInventory(inventoryLevelId, adjustment, userId, reason)
InventoryService.allocateToChannel(inventoryLevelId, storeConnectionId, quantity, userId)
InventoryService.syncToBigCommerce(channelListingId, userId)
InventoryService.syncToShopify(channelListingId, userId)
InventoryService.syncToAllChannels(masterProductId, userId)
InventoryService.getLowStockProducts(userId, limit)
InventoryService.upsertInventoryLevel(data)
```

### 2. API Endpoints

#### GET `/api/inventory`
List all inventory levels with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `lowStock` - Filter low stock items only (true/false)

**Response:**
```json
{
  "items": [
    {
      "id": "inv_123",
      "totalQuantity": 100,
      "allocated": 30,
      "available": 70,
      "lowStockThreshold": 10,
      "safetyStock": 5,
      "trackInventory": true,
      "allowBackorder": false,
      "channelAllocations": {
        "store_1": 15,
        "store_2": 15
      },
      "isLowStock": false,
      "needsRestock": false,
      "product": { ... },
      "updatedAt": "2025-01-14T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### GET `/api/inventory/[productId]`
Get inventory status for a specific product.

**Query Parameters:**
- `variantId` - Optional variant ID for variant-specific inventory

**Response:**
```json
{
  "inventoryLevel": {
    "id": "inv_123",
    "totalQuantity": 100,
    "allocated": 30,
    "available": 70,
    "lowStockThreshold": 10,
    "safetyStock": 5,
    "trackInventory": true,
    "allowBackorder": false
  },
  "allocations": [
    {
      "storeId": "store_1",
      "storeName": "My BigCommerce Store",
      "platform": "BIGCOMMERCE",
      "allocated": 15
    }
  ],
  "isLowStock": false,
  "needsRestock": false
}
```

#### POST `/api/inventory/[productId]/adjust`
Manually adjust inventory levels.

**Request Body:**
```json
{
  "adjustment": 50,
  "reason": "Restocking from supplier"
}
```

**Response:**
```json
{
  "success": true,
  "newTotal": 150,
  "newAvailable": 120
}
```

#### POST `/api/inventory/[productId]/sync`
Sync inventory to all published channels for a product.

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "platform": "BIGCOMMERCE",
      "storeId": "store_1",
      "storeName": "My Store",
      "externalId": "123",
      "quantitySynced": 70
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

#### POST `/api/inventory/bulk-sync`
Sync inventory for multiple products at once.

**Request Body:**
```json
{
  "productIds": ["prod_1", "prod_2", "prod_3"]
}
```

**Response:**
```json
{
  "success": true,
  "productResults": [
    {
      "productId": "prod_1",
      "results": [ ... ]
    }
  ],
  "summary": {
    "productsProcessed": 3,
    "totalSyncs": 6,
    "successful": 6,
    "failed": 0
  }
}
```

#### GET `/api/inventory/low-stock`
Get products below their low stock threshold.

**Query Parameters:**
- `limit` - Maximum items to return (default: 50)

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "inv_123",
      "totalQuantity": 8,
      "allocated": 3,
      "available": 5,
      "lowStockThreshold": 10,
      "safetyStock": 5,
      "needsRestock": true,
      "product": { ... }
    }
  ],
  "count": 12
}
```

### 3. Publisher Integration

Both BigCommerce and Shopify publishers now automatically sync inventory after publishing products.

**BigCommerce Publisher (`lib/publishers/bigcommerce-publisher.ts`):**
- Auto-syncs inventory immediately after successful product publish
- Handles both simple products and variants
- Updates `inventory_level` and `inventory_warning_level` fields
- Sets `inventory_tracking` to 'product' or 'variant'

**Shopify Publisher (`lib/publishers/shopify-publisher.ts`):**
- Auto-syncs inventory after successful product publish
- Uses Shopify's Inventory API (`inventory_levels/set.json`)
- Automatically detects and uses the primary location
- Handles variant-level inventory updates

### 4. Database Model

The `InventoryLevel` model in Prisma schema supports:

```prisma
model InventoryLevel {
  id                String   @id @default(cuid())
  userId            String
  masterProductId   String?  // For simple products
  masterVariantId   String?  // For variants
  
  // Master inventory
  totalQuantity     Int      @default(0)
  allocated         Int      @default(0)  // Reserved for orders
  available         Int      @default(0)  // Computed: total - allocated
  
  // Per-channel allocation
  channelAllocations Json?   // { "storeId1": 10, "storeId2": 5 }
  
  // Safety stock
  lowStockThreshold Int      @default(5)
  safetyStock       Int      @default(0)
  
  // Status
  trackInventory    Boolean  @default(true)
  allowBackorder    Boolean  @default(false)
  
  // Relations
  user            User           @relation(...)
  masterProduct   MasterProduct? @relation(...)
  masterVariant   MasterVariant? @relation(...)
}
```

## Usage Examples

### 1. Check Inventory Status
```typescript
const status = await InventoryService.getInventoryStatus(
  'masterProductId',
  undefined,
  'userId'
)
console.log(`Available: ${status.inventoryLevel.available}`)
console.log(`Low stock: ${status.isLowStock}`)
```

### 2. Adjust Inventory
```typescript
const result = await InventoryService.adjustInventory(
  'inventoryLevelId',
  50,  // Add 50 units
  'userId',
  'Received shipment from supplier'
)
```

### 3. Allocate to Channel
```typescript
await InventoryService.allocateToChannel(
  'inventoryLevelId',
  'storeConnectionId',
  25,  // Allocate 25 units
  'userId'
)
```

### 4. Sync to All Channels
```typescript
const results = await InventoryService.syncToAllChannels(
  'masterProductId',
  'userId'
)

results.forEach(result => {
  console.log(`${result.platform}: ${result.success ? 'Success' : 'Failed'}`)
})
```

### 5. Get Low Stock Products
```typescript
const lowStock = await InventoryService.getLowStockProducts('userId', 20)
console.log(`${lowStock.length} products need restocking`)
```

## Features

### ✅ Real-Time Inventory Tracking
- Track inventory at product and variant levels
- Automatic calculation of available stock
- Per-channel allocation management

### ✅ Multi-Channel Sync
- Sync to BigCommerce stores
- Sync to Shopify stores
- Bulk sync operations
- Auto-sync on product publish

### ✅ Low Stock Alerts
- Configurable threshold per product
- Safety stock levels
- API endpoint for low stock monitoring
- Ready for email notifications (next phase)

### ✅ Inventory Adjustments
- Manual adjustment with reason tracking
- Change logging for audit trail
- Prevents negative inventory (unless backorders enabled)

### ✅ Channel Allocation
- Allocate specific quantities to each store
- Prevents over-allocation
- Tracks allocated vs available stock

### ✅ Backorder Support
- Optional backorder flag per product
- Allow selling when out of stock
- Configurable per product

## Best Practices

### 1. Initial Setup
When creating a master product, initialize inventory:
```typescript
await InventoryService.upsertInventoryLevel({
  userId,
  masterProductId,
  totalQuantity: 100,
  lowStockThreshold: 10,
  safetyStock: 5,
  trackInventory: true,
  allowBackorder: false
})
```

### 2. Publishing Products
Inventory is automatically synced when publishing. To manually sync:
```typescript
// After publish
await InventoryService.syncToAllChannels(masterProductId, userId)
```

### 3. Regular Monitoring
Check low stock regularly:
```typescript
const lowStock = await fetch('/api/inventory/low-stock?limit=100')
const { items } = await lowStock.json()

// Send alerts for items.filter(i => i.needsRestock)
```

### 4. Bulk Updates
For large inventory updates:
```typescript
const productIds = ['prod_1', 'prod_2', 'prod_3']
await fetch('/api/inventory/bulk-sync', {
  method: 'POST',
  body: JSON.stringify({ productIds })
})
```

## Integration Points

### With Product Management
- Products automatically get inventory records on creation
- Variants get individual inventory tracking
- Inventory syncs when publishing to channels

### With Order Processing (Future)
- Allocate inventory when order is created
- Deallocate when order is cancelled
- Update on order fulfillment

### With Webhooks (Future)
- Listen for inventory updates from BigCommerce
- Listen for inventory updates from Shopify
- Auto-sync on external changes

## Error Handling

All inventory operations include comprehensive error handling:

```typescript
try {
  const result = await InventoryService.syncToBigCommerce(listingId, userId)
  if (!result.success) {
    console.error(`Sync failed: ${result.error}`)
  }
} catch (error) {
  console.error('Unexpected error:', error)
}
```

## Performance Considerations

1. **Batch Operations**: Use `bulk-sync` for multiple products
2. **Caching**: Inventory status is calculated on-demand
3. **Rate Limiting**: BigCommerce and Shopify API limits respected
4. **Async Sync**: Inventory sync doesn't block publish operations

## Next Steps

### Phase 2.4: Low Stock Email Alerts
- Email notifications when stock < threshold
- Configurable alert frequency
- Admin dashboard for alert management

### Phase 2.5: Inventory Management UI
- Visual inventory dashboard
- Quick adjustment interface
- Bulk operations UI
- Real-time sync status

### Phase 3: Advanced Features
- Automatic reorder points
- Supplier integration
- Inventory forecasting
- Multi-warehouse support

## Testing

To test the inventory system:

```bash
# 1. Create a master product with inventory
POST /api/products/master
{
  "title": "Test Product",
  "basePrice": 29.99,
  "baseSKU": "TEST-001"
}

# 2. Initialize inventory
POST /api/inventory/[productId]/adjust
{
  "adjustment": 100,
  "reason": "Initial stock"
}

# 3. Check inventory
GET /api/inventory/[productId]

# 4. Publish to channel
POST /api/products/master/[productId]/publish
{
  "storeConnectionId": "store_123"
}

# 5. Verify sync
GET /api/inventory/[productId]
# Check channelAllocations and allocated fields
```

## Troubleshooting

### Inventory Not Syncing
1. Check store connection is active
2. Verify product is published to channel
3. Check API credentials have inventory permissions
4. Review sync error in response

### Incorrect Allocation
1. Verify channel allocations in database
2. Check allocated vs available calculations
3. Review adjustment history in change logs

### Low Stock Not Detecting
1. Confirm `trackInventory` is true
2. Verify `lowStockThreshold` is set correctly
3. Check `available` calculation (total - allocated)

## Summary

✅ **Complete**: Inventory Sync System (Phase 2.3)
- Full inventory service with sync capabilities
- Complete API endpoints
- Auto-sync on publish
- Low stock detection
- Ready for UI and alert features

The inventory system provides a solid foundation for preventing overselling and maintaining accurate stock levels across all sales channels.