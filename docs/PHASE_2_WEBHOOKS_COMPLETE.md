# Phase 2.4: Webhook Infrastructure - COMPLETE ✅

## Overview

Built a complete webhook infrastructure for real-time platform updates and bidirectional synchronization between BigCommerce, Shopify, and the POD master product system.

## What Was Built

### 1. **Webhook Manager** (`lib/webhooks/webhook-manager.ts`)
- Register webhooks with BigCommerce and Shopify
- Store webhook IDs in store connection metadata
- Deregister webhooks when needed
- Get webhook status for stores

**Supported Events:**
- **BigCommerce:**
  - `store/product/updated`
  - `store/product/deleted`
  - `store/product/inventory/updated`
  - `store/order/created`

- **Shopify:**
  - `products/update`
  - `products/delete`
  - `inventory_levels/update`
  - `orders/create`

### 2. **Signature Verification** (`lib/webhooks/signature-verification.ts`)
- Verify BigCommerce webhook signatures (HMAC SHA256)
- Verify Shopify webhook signatures (HMAC SHA256)
- Extract platform-specific headers
- Generic verification interface for all platforms

**Security Features:**
- Timing-safe comparison to prevent timing attacks
- Platform-specific signature extraction
- Secret key management via environment variables

### 3. **Webhook Receiver Endpoints**

#### BigCommerce Receiver
**Endpoint:** `POST /api/webhooks/bigcommerce?storeId={storeConnectionId}`
- Verifies signature using `BIGCOMMERCE_CLIENT_SECRET`
- Stores event in database
- Returns 200 OK to prevent retries

#### Shopify Receiver
**Endpoint:** `POST /api/webhooks/shopify?storeId={storeConnectionId}`
- Verifies signature using `SHOPIFY_WEBHOOK_SECRET`
- Extracts topic from headers
- Stores event in database

#### Etsy Receiver (Placeholder)
**Endpoint:** `POST /api/webhooks/etsy?storeId={storeConnectionId}`
- Placeholder for future Etsy webhook support
- Stores event but doesn't process yet

### 4. **Event Processors** (`lib/webhooks/processors/`)

#### Base Processor (`base-processor.ts`)
- Abstract class for all event processors
- Handles event processing lifecycle
- Logs changes to ChangeLog table
- Registry pattern for processor management

#### Product Updated Processor (`product-updated-processor.ts`)
- Updates ChannelListing when product changes on platform
- Detects price, title, description changes
- Policy: Doesn't auto-update master products (prevents accidental overwrites)
- Logs all changes for audit trail

#### Inventory Updated Processor (`inventory-updated-processor.ts`)
- Updates InventoryLevel when stock changes
- Handles both simple products and variants
- Creates inventory records if they don't exist
- Respects inventory tracking settings

#### Order Created Processor (`order-created-processor.ts`)
- Reduces inventory when orders are placed
- Updates allocated quantity
- Recalculates available inventory
- Supports both simple and variant products

### 5. **Webhook Management API**

#### Register Webhooks
```typescript
POST /api/webhooks/register/{storeId}
```
Registers all webhooks for a store connection.

**Response:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "12345",
      "scope": "store/product/updated",
      "destination": "https://yourapp.com/api/webhooks/bigcommerce?storeId=abc",
      "isActive": true
    }
  ]
}
```

#### List Webhook Events
```typescript
GET /api/webhooks/events?platform=BIGCOMMERCE&processed=false&limit=50
```
Lists webhook events with filtering options.

#### Get Event Details
```typescript
GET /api/webhooks/events/{eventId}
```
Get full details of a specific webhook event.

#### Retry Failed Event
```typescript
POST /api/webhooks/events/{eventId}/retry
```
Resets event and reprocesses it.

#### Manually Process Event
```typescript
POST /api/webhooks/events/{eventId}/process
```
Manually trigger processing of an event.

### 6. **Conflict Resolution** (`lib/webhooks/conflict-resolution.ts`)

#### Detect Conflicts
Identifies discrepancies between master products and channel listings:
- Price differences
- Title mismatches
- Description changes
- Status conflicts

#### Resolution Policies
- **PLATFORM_WINS**: Use platform value, update master
- **MASTER_WINS**: Use master value, update channel
- **MANUAL**: User chooses custom value

#### Functions
```typescript
// Detect conflicts for a channel listing
detectConflicts(channelListingId: string): Promise<ConflictData[]>

// Resolve a specific conflict
resolveConflict(
  conflict: ConflictData,
  policy: ResolutionPolicy,
  userId?: string,
  customValue?: any
): Promise<{ success: boolean; message: string }>

// Auto-resolve all conflicts for a master product
detectAndResolveAllConflicts(
  masterProductId: string,
  policy: ResolutionPolicy,
  userId?: string
): Promise<{ detected: number; resolved: number; failed: number }>

// Get conflict summary
getConflictSummary(storeConnectionId: string): Promise<{
  totalConflicts: number
  byType: Record<ConflictType, number>
}>
```

## Database Models Used

### WebhookEvent
```prisma
model WebhookEvent {
  id                String   @id @default(cuid())
  storeConnectionId String?
  platform          Platform
  eventType         String
  payload           Json
  signature         String?
  processed         Boolean  @default(false)
  processedAt       DateTime?
  processingError   String?  @db.Text
  retryCount        Int      @default(0)
  receivedAt        DateTime @default(now())
}
```

### ChangeLog
```prisma
model ChangeLog {
  id         String    @id @default(cuid())
  userId     String
  entityType String    // "product", "variant", "inventory", "price"
  entityId   String
  field      String
  oldValue   Json?
  newValue   Json?
  source     String    // "user", "sync", "webhook", "bulk_op"
  sourceId   String?
  platform   Platform?
  createdAt  DateTime @default(now())
}
```

## Environment Variables Required

```env
# BigCommerce
BIGCOMMERCE_CLIENT_SECRET=your_client_secret

# Shopify
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Etsy (future)
ETSY_WEBHOOK_SECRET=your_webhook_secret

# App URL for webhook registration
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Usage Examples

### 1. Register Webhooks for a Store

```typescript
// When user connects a store
const response = await fetch(`/api/webhooks/register/${storeConnectionId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})

const result = await response.json()
console.log(`Registered ${result.webhooks.length} webhooks`)
```

### 2. Process Webhook Events

Webhooks are automatically stored when received. To process them:

```typescript
import { ProcessorRegistry } from '@/lib/webhooks/processors/base-processor'
import { ProductUpdatedProcessor } from '@/lib/webhooks/processors/product-updated-processor'
import { InventoryUpdatedProcessor } from '@/lib/webhooks/processors/inventory-updated-processor'
import { OrderCreatedProcessor } from '@/lib/webhooks/processors/order-created-processor'

// Register processors
ProcessorRegistry.register(
  'BIGCOMMERCE',
  'store/product/updated',
  new ProductUpdatedProcessor('BIGCOMMERCE')
)

ProcessorRegistry.register(
  'BIGCOMMERCE',
  'store/product/inventory/updated',
  new InventoryUpdatedProcessor('BIGCOMMERCE')
)

ProcessorRegistry.register(
  'BIGCOMMERCE',
  'store/order/created',
  new OrderCreatedProcessor('BIGCOMMERCE')
)

// Process an event
const result = await ProcessorRegistry.processEvent(eventId)
```

### 3. Detect and Resolve Conflicts

```typescript
import { detectConflicts, resolveConflict } from '@/lib/webhooks/conflict-resolution'

// Detect conflicts
const conflicts = await detectConflicts(channelListingId)

// Resolve with platform data
for (const conflict of conflicts) {
  await resolveConflict(conflict, 'PLATFORM_WINS', userId)
}

// Or resolve with master data
for (const conflict of conflicts) {
  await resolveConflict(conflict, 'MASTER_WINS', userId)
}

// Or manual resolution
await resolveConflict(
  conflict,
  'MANUAL',
  userId,
  customValue  // User-chosen value
)
```

## Testing

### Test Webhook Reception

```bash
# Test BigCommerce webhook
curl -X POST https://yourapp.com/api/webhooks/bigcommerce?storeId=test123 \
  -H "Content-Type: application/json" \
  -H "X-BC-Webhook-Signature: test_signature" \
  -d '{
    "scope": "store/product/updated",
    "data": {
      "id": 123
    },
    "producer": "stores/abc123"
  }'

# Test Shopify webhook
curl -X POST https://yourapp.com/api/webhooks/shopify?storeId=test123 \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256": test_signature" \
  -H "X-Shopify-Topic: products/update" \
  -d '{
    "id": 123,
    "title": "Test Product"
  }'
```

### Test Event Processing

```bash
# List unprocessed events
curl https://yourapp.com/api/webhooks/events?processed=false

# Process an event
curl -X POST https://yourapp.com/api/webhooks/events/event123/process

# Retry a failed event
curl -X POST https://yourapp.com/api/webhooks/events/event123/retry
```

## Key Features

✅ **Real-time Synchronization**: Instant updates from platforms
✅ **Signature Verification**: Secure webhook validation
✅ **Event Storage**: All webhooks logged in database
✅ **Retry Mechanism**: Failed events can be retried
✅ **Conflict Detection**: Identifies data discrepancies
✅ **Flexible Resolution**: Multiple resolution policies
✅ **Audit Trail**: Complete change history via ChangeLog
✅ **Platform Support**: BigCommerce, Shopify, Etsy (placeholder)
✅ **Inventory Management**: Automatic stock updates on orders
✅ **Error Handling**: Graceful failure with error logging

## Next Steps

1. **Register Event Processors** at application startup
2. **Set up background jobs** to process queued webhooks
3. **Configure webhook secrets** in environment
4. **Test with real platforms** using ngrok or similar
5. **Monitor webhook events** via admin dashboard
6. **Implement UI** for conflict resolution

## Architecture Benefits

- **Decoupled**: Receivers store events, processors handle them separately
- **Scalable**: Can process events asynchronously in background
- **Auditable**: Complete history of all changes
- **Flexible**: Easy to add new event types and processors
- **Reliable**: Retry mechanism for failed events
- **Secure**: Signature verification prevents unauthorized webhooks

## Status: ✅ COMPLETE

All webhook infrastructure components have been built and are ready for integration and testing.