# Real-Time Sync Progress Feature

## Overview

Added real-time progress tracking for product syncing with a beautiful dialog that shows live updates and allows users to continue browsing while sync runs in background.

## Features Implemented

### 1. Background Sync Support
- Sync runs in background (non-blocking)
- User can close dialog and continue browsing
- Progress tracked in database via `SyncJob` table

### 2. Real-Time Progress Updates
- Updates every 2 seconds via polling
- Shows current/total product count (e.g., "451 / 1,825")
- Live progress bar with percentage
- Batch-level granularity (updates every 50 products)

### 3. Sync Progress Dialog Component
**File**: `components/products/SyncProgressDialog.tsx`

**Features**:
- Status icons (spinner, checkmark, error)
- Progress bar with live percentage
- Product count display
- Status messages
- Background notice with tip
- Prevents accidental closing during sync
- Auto-refreshes data on completion

**UI States**:
```typescript
'processing' → Shows spinner, progress bar, can close to background
'completed'  → Shows checkmark, success stats, Done button
'failed'     → Shows error icon, error message, Close button
```

### 4. Sync Status API Endpoint
**File**: `app/api/stores/[id]/sync-status/route.ts`

**Returns**:
```json
{
  "jobId": "abc123",
  "status": "processing",
  "totalItems": 1825,
  "processedItems": 451,
  "progress": 24,
  "results": {
    "synced": 445,
    "failed": 6,
    "total": 1825
  }
}
```

### 5. Database Progress Tracking

**Updates in Sync**:
```typescript
// Set total when fetch completes
await db.syncJob.update({
  where: { id: jobId },
  data: { totalItems: allProducts.length }
})

// Update after each batch (every 50 products)
await db.syncJob.update({
  where: { id: jobId },
  data: {
    processedItems: syncedCount + failedCount,
    results: {
      synced: syncedCount,
      failed: failedCount,
      total: allProducts.length
    }
  }
})
```

## User Experience

### Starting a Sync
1. User clicks "Sync" button on Products page
2. If multiple stores, shows store selection dialog
3. Starts background sync
4. Opens progress dialog automatically

### During Sync
```
┌────────────────────────────────────────┐
│ 🔄 Product Sync                        │
│ Syncing products from Store Name       │
├────────────────────────────────────────┤
│                                        │
│ 451 / 1,825 products          24%     │
│ ████████░░░░░░░░░░░░░░░░░░░░░░        │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Syncing products...                │ │
│ │ This may take a few minutes for    │ │
│ │ large catalogs...                  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 💡 Tip: You can close this window  │ │
│ │ and continue browsing. The sync    │ │
│ │ will continue in the background.   │ │
│ └────────────────────────────────────┘ │
│                                        │
│              [ Close (Background) ]     │
└────────────────────────────────────────┘
```

### On Completion
```
┌────────────────────────────────────────┐
│ ✅ Product Sync                        │
│ Syncing products from Store Name       │
├────────────────────────────────────────┤
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Sync completed successfully!       │ │
│ │                                    │ │
│ │ ✓ 1,819 products synced            │ │
│ │ ⚠ 6 products failed                │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Pricing Tier: Premium ($50/mo)        │
│ Product Range: 1000-1500              │
│                                        │
│                        [ Done ]         │
└────────────────────────────────────────┘
```

### Background Sync Notice
**Prominent tip displayed**:
> 💡 **Tip**: You can close this window and continue browsing. The sync will continue in the background.

**Dialog behavior**:
- Shows confirmation when closing during active sync
- Allows closing after explicit confirmation
- Auto-closes on completion (with Done button)

## Code Changes

### 1. Products Page
**File**: `app/products/page.tsx`

**Changes**:
- Added `SyncProgressDialog` import
- Added sync state: `syncingStoreId`, `syncingStoreName`, `showProgressDialog`
- Changed sync to use `background: true` mode
- Opens progress dialog on sync start
- Refreshes data when dialog closes

### 2. Sync API
**File**: `app/api/stores/[id]/sync/route.ts`

**Changes**:
- Pass `jobId` to all platform-specific sync functions
- Update `SyncJob.totalItems` when fetch completes
- Update `SyncJob.processedItems` after each batch
- Store results in `SyncJob.results` field

### 3. Platform Sync Functions
**All platforms updated** (`syncBigCommerceProducts`, `syncShopifyProducts`, etc.):
- Accept `jobId` parameter
- Update job progress during sync
- Report detailed results

## Technical Details

### Polling Strategy
```typescript
useEffect(() => {
  if (!open || !storeId) return
  
  const checkStatus = async () => {
    const response = await fetch(`/api/stores/${storeId}/sync-status`)
    const data = await response.json()
    setStatus(data)
    
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(intervalId)
    }
  }
  
  checkStatus() // Check immediately
  const intervalId = setInterval(checkStatus, 2000) // Then every 2s
  
  return () => clearInterval(intervalId)
}, [open, storeId])
```

### Performance Considerations
- Updates every 50 products (batch size)
- Database writes minimized to once per batch
- Progress polling every 2 seconds (not too aggressive)
- Dialog closes polling on completion

### Error Handling
- Shows user-friendly error messages
- Preserves partial progress in database
- Allows retry after failure
- Logs detailed errors for debugging

## Future Enhancements

1. **Real-time via WebSockets** (instead of polling)
2. **Sync history** (view past syncs)
3. **Estimated time remaining** (based on current rate)
4. **Pause/Resume sync** (for very large catalogs)
5. **Detailed error breakdown** (which products failed and why)
6. **Concurrent multi-store sync** (sync all stores at once)

## Benefits

✅ **User Experience**
- Clear visibility of sync progress
- Can continue working during sync
- No more "black box" waiting

✅ **Technical**
- Background processing
- Database-tracked progress
- Resumable on crash
- Detailed logging

✅ **Performance**
- Non-blocking sync
- Batch processing
- Rate limiting respected
- Automatic retry on transient failures

## Example: Large Catalog Sync

**Store**: Rhinestone Marketplace  
**Platform**: BigCommerce  
**Products**: 1,825

**Timeline**:
```
0:00 → User clicks Sync
0:01 → Dialog opens, "Fetching products..."
0:15 → "451 / 1,825 (24%)" - First batch complete
0:30 → "901 / 1,825 (49%)" - Halfway
0:45 → "1,351 / 1,825 (74%)" - Nearly done
1:00 → "1,825 / 1,825 (100%)" - Complete
1:01 → Assigns Premium tier ($50/mo)
1:02 → Shows completion message
```

**User can**:
- Close dialog at 0:20
- Browse other pages
- Check back later
- Dialog shows completion when reopened