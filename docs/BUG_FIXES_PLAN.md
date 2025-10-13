# Bug Fixes: 404 Error & Sync Issues

**Date**: 2025-10-13  
**Priority**: Critical  
**Status**: In Progress

---

## 🐛 Issue 1: Store Card Shows Disconnect Instead of Manage

### Problem
Users click on store card expecting to manage it, but get disconnect dialog instead.

**Location**: [`app/stores/stores-content.tsx:381`](app/stores/stores-content.tsx:381)

```typescript
// Current (BROKEN):
<Card onClick={() => setDisconnectId(store.id)}>
  // Shows disconnect dialog on click
</Card>
```

### Solution
Add proper action buttons to store cards:
- ✅ **Manage** button → Navigate to store details
- ✅ **Sync** button → Trigger sync with feedback
- ⚠️ **Disconnect** button → Show confirmation dialog

---

## 🐛 Issue 2: No Products Syncing - Poor Error Visibility

### Problems
1. No error logging UI for users to see what went wrong
2. Generic error messages that don't help debug
3. No sync progress indication
4. Platform API errors not surfaced properly

### Solution
Create comprehensive error logging system:

1. **Error Log Page** (`/stores/[id]/logs`)
   - Show all sync attempts
   - Display detailed error messages
   - Platform-specific failure reasons
   - Timestamps and retry buttons

2. **Enhanced Sync Feedback**
   - Real-time progress updates
   - Clear error messages (e.g., "Invalid BigCommerce token")
   - Actionable next steps (e.g., "Reconnect store")

3. **Database Logging**
   - Log all sync attempts to `SyncJob` table
   - Capture full error details
   - Track retry attempts

---

## 📋 Implementation Checklist

### Phase 1: Fix Store Card UI (30 minutes)
- [ ] Remove click handler from card wrapper
- [ ] Add "Manage" button → `/stores/[id]`
- [ ] Add "Sync" button with loading state
- [ ] Move "Disconnect" to dropdown menu
- [ ] Add sync progress indicator

### Phase 2: Enhance Error Logging (1 hour)
- [ ] Create `/stores/[id]/logs` page
- [ ] Add error logging to sync API
- [ ] Capture platform-specific errors
- [ ] Add retry functionality
- [ ] Show errors in store detail page

### Phase 3: Improve Error Messages (30 minutes)
- [ ] Map API errors to user-friendly messages
- [ ] Add troubleshooting tips per error type
- [ ] Create error message dictionary
- [ ] Add "What to do next" guidance

### Phase 4: Add Sync Progress (30 minutes)
- [ ] Add progress tracking to SyncJob
- [ ] Show real-time progress in UI
- [ ] Add estimated time remaining
- [ ] Show which products are syncing

---

## 🎯 Expected Outcomes

### Before Fix
- ❌ Click store card → Disconnect dialog (confusing!)
- ❌ Sync fails → "Failed to sync" (no details)
- ❌ No way to see error logs
- ❌ No way to debug issues

### After Fix
- ✅ Click "Manage" → Store details page
- ✅ Click "Sync" → Progress indicator → Success/error with details
- ✅ View error logs → See exactly what went wrong
- ✅ Clear next steps → "Reconnect store" or "Check token"

---

## 🔧 Technical Details

### Enhanced SyncJob Model
```typescript
model SyncJob {
  // ... existing fields
  
  // Add detailed error tracking
  errorType      String?   // "auth_failed", "rate_limit", "network"
  errorDetails   Json?     // Full error object
  retryCount     Int @default(0)
  canRetry       Boolean @default(true)
  nextRetryAt    DateTime?
  
  // Progress tracking
  currentStep    String?   // "fetching_products", "saving_to_db"
  estimatedTotal Int?
}
```

### Error Message Dictionary
```typescript
const ERROR_MESSAGES = {
  'auth_failed': {
    title: 'Authentication Failed',
    message: 'Your store credentials are invalid or expired',
    action: 'Reconnect your store to refresh credentials',
    canRetry: false
  },
  'rate_limit': {
    title: 'Rate Limit Exceeded',
    message: 'Too many requests to the platform API',
    action: 'Wait a few minutes and try again',
    canRetry: true,
    retryAfter: 300 // 5 minutes
  },
  'network_error': {
    title: 'Network Error',
    message: 'Failed to connect to platform API',
    action: 'Check your internet connection and try again',
    canRetry: true
  }
}
```

---

## 📊 Files to Modify

1. **app/stores/stores-content.tsx** (Fix card click behavior)
2. **app/stores/[id]/page.tsx** (Add error display)
3. **app/stores/[id]/logs/page.tsx** (NEW - Error log viewer)
4. **app/api/stores/[id]/sync/route.ts** (Enhanced error logging)
5. **lib/sync-errors.ts** (NEW - Error message dictionary)
6. **prisma/schema.prisma** (Add error tracking fields)

---

## 🚀 Deployment Steps

1. Apply database migration (add error tracking fields)
2. Deploy updated code
3. Test with a real store connection
4. Verify error messages are clear
5. Test retry functionality

---

## ✅ Success Criteria

- [ ] Users can click "Manage" and navigate to store details
- [ ] Sync errors show clear, actionable messages
- [ ] Error log page displays all sync attempts
- [ ] Users know exactly what went wrong and how to fix it
- [ ] Retry functionality works for retryable errors
- [ ] No more 404 errors on store management

---

**Priority**: 🔴 Critical - Blocking users from managing stores
**Effort**: 2-3 hours
**Impact**: High - Fixes major usability issues