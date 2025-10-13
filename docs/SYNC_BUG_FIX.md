# BigCommerce Sync Bug Fix

## Issues Identified

### 1. **Silent Sync Failures** (CRITICAL)
**Location**: `app/api/stores/[id]/sync/route.ts` lines 508-511

**Problem**: 
- Errors during product save were caught but silently swallowed
- Sync job marked as "completed" even when ALL products failed to save
- No error logging or user feedback
- Result: User sees "349 products synced" but database has 0 products

**Root Cause**:
```typescript
} catch (productError) {
  console.error(`❌ Failed to sync product ${bcProduct.id}:`, productError)
  // Continue with next product  <-- Error ignored, continues silently
}
```

**Fix Applied**:
- Track `failedCount` separately from `syncedCount`
- Collect all error messages for reporting
- Abort sync if failure rate exceeds 50% after 10+ failures
- Throw error if 0 products synced but products were fetched
- Detailed logging for each product (created vs updated)
- Show comprehensive summary at end of sync

### 2. **Misleading Disconnect Warning**
**Location**: `app/stores/stores-content.tsx` line 507-510

**Problem**:
- Dialog said "Your products will be preserved but won't sync anymore"
- But code at `app/api/stores/[id]/route.ts:110-112` actually DELETES all products
- Users disconnecting stores thinking products are safe

**Fix Applied**:
- Changed warning to: "⚠️ Disconnect Store & Delete All Products"
- Shows exact product count that will be deleted
- Clear message: "This action cannot be undone"
- Red destructive styling to emphasize danger

---

## How to Test the Fixes

### 1. Run Diagnostics (RECOMMENDED FIRST)

```bash
# Check current state
npx ts-node scripts/diagnose-sync-failure.ts

# Clean up any database issues
npx ts-node scripts/fix-sync-issue.ts

# Count products before sync
npx ts-node scripts/count-products.ts
```

### 2. Test Sync with Enhanced Logging

The sync now provides detailed console output:

```
🔄 Starting BigCommerce product sync for store: Rhinestone Marketplace
📦 Fetching products page 1...
✓ Fetched 250 products (Total: 250)
📦 Fetching products page 2...
✓ Fetched 99 products (Total: 349)
📊 Total products fetched: 349

💾 Saving products to database in batches of 50...
✓ Created product 123: Diamond Rhinestone Pack
✓ Created product 124: Crystal Clear Set
✓ Updated product 125: Gold Sparkle Kit
...
✓ Processed batch 1/7 (50 synced, 0 failed)
...

📊 Sync Summary:
   Total products fetched: 349
   Successfully synced: 349
   Failed: 0

✅ Sync complete! 349 products synced successfully
```

If errors occur, you'll see:

```
❌ Failed to sync product 126 (Premium Set): 
   Unique constraint failed on the fields: (`userId`,`platform`,`externalId`,`importMethod`)

⚠️ Errors encountered:
   - Product 126: Unique constraint violation
   - Product 127: Invalid price value
   ... and 3 more errors

❌ Error: Sync aborted: Too many failures (15 failed, 5 succeeded)
```

### 3. Verify Product Count

After sync completes:

```bash
# Check database
npx ts-node scripts/count-products.ts

# Check via API
curl http://localhost:3000/api/products
```

---

## Common Issues & Solutions

### Issue: "Unique constraint violation"
**Cause**: Duplicate products exist in database  
**Solution**: 
```bash
npx ts-node scripts/fix-sync-issue.ts
```

### Issue: "0 products synced" but BigCommerce API returns products
**Possible Causes**:
1. **Database connection issue** - Check DATABASE_URL in .env
2. **Missing storeConnectionId** - Run diagnostics to verify store record
3. **Constraint violation** - Run fix-sync-issue script
4. **Permission issue** - Check user subscription limits

**Debug Steps**:
```bash
# 1. Check store connection exists
npx ts-node scripts/check-stores.ts

# 2. Check recent sync jobs
npx ts-node scripts/check-sync-jobs.ts

# 3. Run full diagnostics
npx ts-node scripts/diagnose-sync-failure.ts

# 4. Check server logs for detailed error messages
pm2 logs bigcommerce-api
# or
tail -f /var/log/pm2/bigcommerce-api-error.log
```

### Issue: Products synced but productCount shows 0
**Cause**: Store record not updated after sync  
**Check**: `app/api/stores/[id]/sync/route.ts` lines 517-521

---

## Database Schema Requirements

The sync requires this unique constraint on Product table:

```prisma
@@unique([userId, platform, externalId, importMethod])
```

This means:
- Same product can exist for different users (multi-tenant)
- Same product from different platforms (BigCommerce vs Shopify)
- Same product via different import methods (oauth vs legacy)
- But NOT duplicate oauth imports of same product for same user

---

## Testing Checklist

- [ ] Run `diagnose-sync-failure.ts` - all green?
- [ ] Connect BigCommerce store - successful?
- [ ] Sync products - see detailed logs?
- [ ] Count products - matches synced count?
- [ ] Check store card - shows correct product count?
- [ ] Try to disconnect - see proper warning?
- [ ] Actually disconnect - products deleted?
- [ ] Reconnect same store - can sync again?
- [ ] Check sync with intentional errors - aborts gracefully?

---

## Files Modified

1. **app/api/stores/[id]/sync/route.ts** (Lines 451-530)
   - Added error tracking and detailed logging
   - Added failure rate abort logic
   - Added sync summary reporting
   - Better error messages

2. **app/stores/stores-content.tsx** (Lines 505-511)
   - Fixed misleading disconnect warning
   - Shows exact product count to be deleted
   - Emphasizes permanence of action

3. **scripts/diagnose-sync-failure.ts** (NEW)
   - Comprehensive sync diagnostics
   - Database validation
   - Duplicate detection
   - Test product creation

4. **scripts/fix-sync-issue.ts** (NEW)
   - Cleans orphaned products
   - Removes duplicates
   - Prepares database for successful sync

---

## Next Steps

1. Deploy these fixes to production
2. Ask user to run diagnostics script
3. Have user test sync with detailed logging enabled
4. Monitor server logs during sync
5. Verify product count in database matches UI

If sync still fails after these fixes, the logs will now show the EXACT error instead of silently failing.