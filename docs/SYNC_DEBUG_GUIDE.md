# Sync Debugging Guide: When Products Don't Sync

**Issue**: Store shows in connections but products don't sync

---

## 🔍 Diagnostic Steps

### Step 1: Check Store Connection Status

```bash
# Get store details
curl http://localhost:3000/api/stores

# Look for:
# - isActive: should be true
# - syncStatus: should be 'connected' or null
# - syncError: should be null or empty
```

### Step 2: Check SyncJob Table

```sql
-- Check for failed sync jobs
SELECT * FROM "SyncJob" 
WHERE "platform" = 'BIGCOMMERCE' 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Look for:
-- status: 'failed'
-- errorLog: error message
```

### Step 3: Test Sync Manually

```bash
# Try to sync via API
curl -X POST http://localhost:3000/api/stores/[STORE_ID]/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]"

# Check response for errors
```

### Step 4: Check BigCommerce Token

```bash
# Test if token is valid
curl "https://api.bigcommerce.com/stores/[STORE_HASH]/v2/store" \
  -H "X-Auth-Token: [ACCESS_TOKEN]"

# Should return store info, not 401/403
```

---

## 🐛 Common Causes

### Cause 1: Invalid/Expired Token
**Symptoms**:
- syncError: "Authentication Failed"
- syncStatus: "error"

**Solution**:
- User needs to reconnect store
- Generate new access token in BigCommerce
- Or refresh OAuth token

### Cause 2: Subscription Tier Blocking
**Symptoms**:
- Error: "Platform access denied"
- syncError: "Your FREE plan doesn't include BIGCOMMERCE"

**Solution**:
- Check user's subscription tier
- FREE tier only allows 1 store with BigCommerce
- PAID allows all platforms

**Check**:
```sql
SELECT u.email, s.tier 
FROM "User" u
LEFT JOIN "Subscription" s ON s."userId" = u.id
WHERE u.email = 'customer@email.com';
```

### Cause 3: Rate Limiting
**Symptoms**:
- syncError: "Rate limit exceeded"
- Only partial products synced

**Solution**:
- Wait 5 minutes
- Retry sync
- System should auto-retry

### Cause 4: No Products in Store
**Symptoms**:
- Sync completes but productCount = 0
- No error message

**Solution**:
- Check if BigCommerce store actually has products
- User needs to add products first

### Cause 5: Network/API Error
**Symptoms**:
- syncError: "Network error"
- syncError: "Failed to fetch products"

**Solution**:
- Check internet connection
- Verify BigCommerce API is up
- Retry sync

---

## 🔧 Debugging Checklist

For the specific customer issue, check:

- [ ] Store exists in StoreConnection table
- [ ] isActive = true
- [ ] accessToken is encrypted and valid
- [ ] User's subscription tier allows platform
- [ ] No recent failed SyncJob records
- [ ] BigCommerce token works (test with curl)
- [ ] Store actually has products in BigCommerce
- [ ] No rate limit issues
- [ ] syncError field shows specific error

---

## 📊 SQL Queries to Run

```sql
-- 1. Get customer's stores
SELECT 
  id, 
  platform, 
  storeName, 
  isActive, 
  syncStatus, 
  syncError,
  productCount,
  lastSyncedAt
FROM "StoreConnection"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'customer@email.com')
ORDER BY "createdAt" DESC;

-- 2. Check recent sync jobs
SELECT 
  id,
  platform,
  action,
  status,
  "errorLog",
  "startedAt",
  "completedAt"
FROM "SyncJob"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'customer@email.com')
ORDER BY "createdAt" DESC
LIMIT 10;

-- 3. Check subscription
SELECT 
  u.email,
  s.tier,
  s.status,
  pp.productLimit,
  pp.allowBigCommerce,
  pp.allowShopify,
  pp.allowEtsy,
  pp.allowTikTok
FROM "User" u
LEFT JOIN "Subscription" s ON s."userId" = u.id
LEFT JOIN "PricingPlan" pp ON pp.tier = s.tier
WHERE u.email = 'customer@email.com';

-- 4. Count products
SELECT COUNT(*) as product_count
FROM "Product"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'customer@email.com');
```

---

## 🎯 Most Likely Cause

Based on your description, I suspect:

1. **Token Issue** - Old token expired, need fresh one
2. **Subscription Block** - Platform access denied
3. **Silent Failure** - Error not logged properly

---

## 🚀 Quick Fix for Customer

Have them try:
1. Go to `/stores`
2. Click "Disconnect" on the problem store
3. Wait 5 seconds
4. Click "Connect Store" again
5. Enter fresh credentials
6. Try sync from `/products` page

---

## 📝 Better Error Logging Needed

We added error classification system but need to:
- [ ] Show sync errors in dashboard
- [ ] Add "View Error Log" button on store cards
- [ ] Create /stores/[id]/logs page
- [ ] Email notification for failed syncs

See [`docs/COMPREHENSIVE_GAP_ANALYSIS.md`](docs/COMPREHENSIVE_GAP_ANALYSIS.md) - Dead-letter queue feature (3 days to implement)

---

Would you like me to:
1. **Debug the specific customer** - Need their email/store ID
2. **Add error log viewer** - Show sync errors in UI
3. **Both** - Debug now, then add logging

Let me know and I'll help resolve it!