# Database Architecture - TEKMS

## ✅ 100% Database-Driven Application

**Yes, TEKMS is completely database-driven!** All user data, credentials, subscriptions, and usage are stored in PostgreSQL.

---

## 📊 Database Tables & Their Purpose

### 1. **User Management**

#### `User` Table
```sql
- id (primary key)
- email (unique, indexed)
- name
- password (hashed with bcrypt)
- emailVerified
- image
- role (USER or ADMIN)
- createdAt, updatedAt
```

**Stores:** All user accounts (email/password and OAuth)

#### `Account` Table (OAuth)
```sql
- id (primary key)
- userId (foreign key → User)
- provider (google, etc.)
- providerAccountId
- access_token, refresh_token (encrypted)
- expires_at
```

**Stores:** OAuth provider connections (Google, etc.)

#### `Session` Table
```sql
- id (primary key)
- sessionToken (unique)
- userId (foreign key → User)
- expires
```

**Stores:** Active user sessions (managed by NextAuth)

#### `VerificationToken` Table
```sql
- identifier
- token (unique)
- expires
```

**Stores:** Email verification tokens, password reset tokens

---

### 2. **Subscription Management**

#### `Subscription` Table
```sql
- id (primary key)
- userId (unique, foreign key → User)
- stripeCustomerId (unique)
- stripeSubscriptionId (unique)
- stripePriceId
- stripeCurrentPeriodEnd
- tier (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- status (ACTIVE, CANCELED, etc.)
- cancelAtPeriodEnd (boolean)
- createdAt, updatedAt
```

**Stores:** User subscription plans and Stripe integration data

**Subscription Tiers:**
- FREE: 10 products/month
- STARTER: 500 products/month ($29)
- PROFESSIONAL: 5,000 products/month ($79)
- ENTERPRISE: Unlimited ($199)

---

### 3. **API Credentials (Encrypted!)** 🔐

#### `UserCredential` Table
```sql
- id (primary key)
- userId (foreign key → User)
- platform (BIGCOMMERCE, TIKTOK, ETSY)
- encryptedKey (AES-256 encrypted)
- label (optional name)
- isActive (boolean)
- createdAt, updatedAt
```

**Stores:** Encrypted API credentials for each platform

**Security Features:**
- ✅ Credentials encrypted with AES-256-GCM
- ✅ Encryption key from environment variable
- ✅ IV (Initialization Vector) stored with each credential
- ✅ Authentication tag for integrity
- ✅ Never exposed in API responses
- ✅ Decrypted only when needed for API calls

**Encryption Implementation:**
See: [`lib/encryption/credentials.ts`](../lib/encryption/credentials.ts)

---

### 4. **Usage Tracking**

#### `UsageRecord` Table
```sql
- id (primary key)
- userId (foreign key → User)
- action (ETSY_IMPORT, TIKTOK_EXPORT, etc.)
- productCount (number of products)
- platform (BIGCOMMERCE, TIKTOK, ETSY)
- metadata (JSON - additional details)
- createdAt
```

**Stores:** Every operation performed by users

**Tracked Actions:**
- Etsy product imports (per URL)
- TikTok product exports (per product)
- BigCommerce operations
- Any other platform actions

**Usage Enforcement:**
1. Before operation: Check if user has remaining quota
2. During operation: Process the request
3. After operation: Record usage to database
4. Monthly reset: Automatic on 1st of each month

---

## 🔒 Security Architecture

### Data at Rest (Database)
- ✅ **Passwords:** Hashed with bcrypt (10 rounds)
- ✅ **API Credentials:** AES-256-GCM encrypted
- ✅ **OAuth Tokens:** Stored encrypted in Account table
- ✅ **Session Tokens:** Secure random UUIDs
- ✅ **Database:** SSL/TLS connection required

### Data in Transit
- ✅ **HTTPS:** All communication encrypted
- ✅ **Secure Cookies:** httpOnly, secure, sameSite
- ✅ **API Calls:** Always over HTTPS
- ✅ **Webhook Signatures:** Verified (Stripe)

### Access Control
- ✅ **Row Level:** Users can only access their own data
- ✅ **API Routes:** All require authentication
- ✅ **Middleware:** Protects dashboard routes
- ✅ **Role-Based:** ADMIN vs USER permissions

---

## 💾 What's Stored vs Not Stored

### ✅ Stored in Database:
- User accounts and profiles
- Email/password credentials (hashed)
- OAuth connections (Google)
- Session tokens
- Subscription data (tier, status, Stripe IDs)
- API credentials (encrypted: BigCommerce, TikTok, Etsy)
- Usage records (every operation)
- Timestamps for everything

### ❌ NOT Stored in Database:
- Raw passwords (only bcrypt hashes)
- Unencrypted API credentials
- BigCommerce products (fetched via API)
- TikTok products (fetched via API)
- Etsy products (fetched via API)
- Temporary scraping data (processed in memory)
- Session data in Redis/memory (uses database sessions)

---

## 🔄 Data Flow Examples

### Example 1: Etsy Import
```
1. User enters Etsy URL
2. Check usage limit (query UsageRecord table)
3. If allowed, scrape Etsy product
4. Create product in BigCommerce (using encrypted credentials)
5. Save usage record to database
6. Return success to user
```

**Database Queries:**
- `SELECT` from UserCredential (get BigCommerce API creds)
- `SELECT` from UsageRecord (check monthly usage)
- `INSERT` into UsageRecord (track this import)

### Example 2: User Sign Up
```
1. User submits email/password
2. Hash password with bcrypt
3. Create User in database
4. Create Subscription (FREE tier)
5. Create Session token
6. Return success + set session cookie
```

**Database Queries:**
- `INSERT` into User
- `INSERT` into Subscription
- `INSERT` into Session

### Example 3: TikTok Export
```
1. User selects products to export
2. Check usage limit (query database)
3. Fetch products from BigCommerce API
4. Transform to TikTok format
5. Generate Excel file
6. Track usage in database
7. Return Excel file
```

**Database Queries:**
- `SELECT` from UserCredential (get BigCommerce creds)
- `SELECT` from UsageRecord (check usage)
- `INSERT` into UsageRecord (track export)

---

## 📈 Database Indexes (Performance)

### Optimized Queries:
```sql
-- User lookups by email (login)
CREATE INDEX idx_user_email ON User(email)

-- Session lookups (every request)
CREATE INDEX idx_session_token ON Session(sessionToken)

-- Usage tracking queries
CREATE INDEX idx_usage_user_date ON UsageRecord(userId, createdAt)
CREATE INDEX idx_usage_date ON UsageRecord(createdAt)

-- Credential lookups
CREATE INDEX idx_credential_user_platform ON UserCredential(userId, platform)

-- Subscription lookups
CREATE INDEX idx_subscription_user ON Subscription(userId)
CREATE INDEX idx_subscription_stripe ON Subscription(stripeCustomerId)
```

---

## 🔧 Database Maintenance

### Automated:
- ✅ Cleanup expired sessions (NextAuth handles this)
- ✅ Usage resets monthly (calculated on-the-fly)
- ✅ Connection pooling (Prisma)
- ✅ Query optimization (indexed columns)

### Manual (Recommended):
```sql
-- Monthly cleanup of old usage records (optional)
DELETE FROM UsageRecord WHERE createdAt < NOW() - INTERVAL '90 days';

-- Cleanup expired verification tokens
DELETE FROM VerificationToken WHERE expires < NOW();
```

---

## 📊 Current Database Stats

To check your database size:
```sql
-- Connect to your database
psql $DATABASE_URL

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

## 🚀 Scaling Considerations

### Current Architecture:
- **Database:** PostgreSQL (single instance)
- **Connection Pooling:** Prisma (default)
- **Sessions:** Database-stored (JWT tokens)

### When to Scale:
1. **1,000+ users:** Consider read replicas
2. **10,000+ users:** Add Redis for session caching
3. **100,000+ users:** Database sharding by user_id

### Performance Tips:
- ✅ All foreign keys indexed
- ✅ Unique constraints on critical fields
- ✅ Cascade deletes configured
- ✅ Query optimization with Prisma
- ✅ Connection pooling enabled

---

## 🎯 Summary

**Your application is 100% database-driven with:**

✅ **PostgreSQL** for all persistent data  
✅ **Encrypted credentials** (never plain text)  
✅ **Hashed passwords** (bcrypt)  
✅ **Usage tracking** (every operation)  
✅ **Subscription management** (Stripe integration)  
✅ **Session management** (NextAuth + database)  
✅ **OAuth support** (Google)  
✅ **Multi-tenant** (user isolation)  
✅ **Audit trail** (timestamps on everything)  
✅ **HTTPS** (secure in transit)  
✅ **Encrypted at rest** (credentials)  

**Zero hardcoded credentials or data!** Everything is dynamic and stored securely in the database.