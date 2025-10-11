# SaaS Architecture Plan: TEKMS Listing Manager

## Executive Summary

Transform the current BigCommerce API tool into **TEKMS Listing Manager** - a comprehensive SaaS platform for managing product listings across multiple marketplaces (BigCommerce, Shopify, Etsy, TikTok).

### Core Value Proposition
- **Unified Dashboard**: Manage all marketplace listings from one interface
- **Automated Workflows**: Import from Etsy, export to TikTok, sync with BigCommerce/Shopify
- **Tiered Access**: Free (10 products), Starter, Professional, Enterprise tiers
- **Scalable Architecture**: Handle thousands of SKUs with fast search

---

## Technology Stack

### Frontend & Framework
- **Next.js 15** (App Router) - Already in use
- **React 19** - Already in use
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Styling (already configured)
- **shadcn/ui** - UI components (already integrated)

### Authentication & Authorization
- **NextAuth.js v5** (Auth.js)
  - Google OAuth provider
  - Credentials provider (email/password)
  - JWT sessions for performance
  - Role-based access control (USER, ADMIN)

### Database & ORM
- **PostgreSQL** - Primary database
- **Prisma ORM** - Already configured with migrations
  - Existing schema includes: User, Account, Session, Subscription, UserCredential, UsageRecord

### Payment & Subscriptions
- **Stripe**
  - Subscription management
  - Webhook handling for events
  - Customer portal for self-service
  - Tiered pricing (Free, Starter, Professional, Enterprise)

### Search & Performance
- **Meilisearch**
  - Lightning-fast product search
  - Typo-tolerant
  - Faceted search (by platform, category, price range)
  - Real-time indexing

### Email & Notifications
- **Resend** (Primary choice - modern, developer-friendly)
  - Welcome emails on registration
  - Email verification links
  - Password reset emails
  - Subscription confirmation
  - Subscription upgrade/downgrade notifications
  - Payment success/failure alerts
  - Usage limit warnings (80%, 100%)
  - Monthly usage reports
  - Admin notifications

### Deployment
- **Vercel** - Hosting platform
  - Edge functions for API routes
  - Automatic deployments
  - Preview environments

---

## Database Schema Architecture

### Existing Schema (Already Migrated)

```prisma
// Core User Management
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?   // For credential login
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(USER)
  
  // Relations
  accounts      Account[]
  sessions      Session[]
  subscription  Subscription?
  credentials   UserCredential[]
  usageRecords  UsageRecord[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
}

enum UserRole {
  USER
  ADMIN
}

// OAuth Accounts (Google, etc.)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@index([userId])
}

// Sessions
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

// Subscription Management
model Subscription {
  id                     String             @id @default(cuid())
  userId                 String             @unique
  stripeCustomerId       String?            @unique
  stripeSubscriptionId   String?            @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  tier                   SubscriptionTier   @default(FREE)
  status                 SubscriptionStatus @default(ACTIVE)
  cancelAtPeriodEnd      Boolean            @default(false)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}

enum SubscriptionTier {
  FREE        // 10 products/month
  STARTER     // 100 products/month
  PROFESSIONAL // 1000 products/month
  ENTERPRISE  // Unlimited + all features
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
  INCOMPLETE
  INCOMPLETE_EXPIRED
  UNPAID
}

// Platform API Credentials
model UserCredential {
  id           String   @id @default(cuid())
  userId       String
  platform     Platform
  encryptedKey String   // Encrypted API key/token
  label        String?  // User-friendly label
  isActive     Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform, label])
  @@index([userId, platform])
}

enum Platform {
  BIGCOMMERCE
  SHOPIFY
  TIKTOK
  ETSY
}

// Usage Tracking
model UsageRecord {
  id           String    @id @default(cuid())
  userId       String
  action       String    // "import", "export", "sync", etc.
  productCount Int       @default(1)
  platform     Platform?
  metadata     Json?     // Additional context
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([createdAt])
}
```

### Additional Schema Requirements

```prisma
// Product Storage & Caching
model Product {
  id               String   @id @default(cuid())
  userId           String
  platform         Platform
  externalId       String   // Platform-specific ID
  
  // Core fields
  name             String
  description      String?  @db.Text
  sku              String?
  price            Decimal  @db.Decimal(10, 2)
  compareAtPrice   Decimal? @db.Decimal(10, 2)
  
  // Search optimization
  searchVector     String?  // For full-text search
  categories       String[] // Denormalized categories
  tags             String[] // Denormalized tags
  
  // Metadata
  images           Json?    // Array of image URLs
  variants         Json?    // Product variants
  customFields     Json?    // Platform-specific data
  
  // Sync status
  lastSyncedAt     DateTime?
  syncStatus       String?  // "synced", "pending", "error"
  syncError        String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform, externalId])
  @@index([userId, platform])
  @@index([userId, createdAt])
  @@index([searchVector]) // For text search
}

// Sync Jobs (for async operations)
model SyncJob {
  id          String   @id @default(cuid())
  userId      String
  platform    Platform
  action      String   // "import", "export", "bulk_update"
  status      String   // "pending", "processing", "completed", "failed"
  
  // Progress tracking
  totalItems  Int      @default(0)
  processedItems Int   @default(0)
  failedItems    Int   @default(0)
  
  // Results
  results     Json?    // Detailed results
  errorLog    String?  @db.Text
  
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  
  @@index([userId, status])
  @@index([createdAt])
}

// Dynamic Pricing Plans (Admin Manageable)
model PricingPlan {
  id              String   @id @default(cuid())
  tier            SubscriptionTier @unique
  name            String   // "Free", "Starter", "Professional", "Enterprise"
  description     String?
  price           Decimal  @db.Decimal(10, 2) // Monthly price
  yearlyPrice     Decimal? @db.Decimal(10, 2) // Optional yearly price
  stripePriceId   String?  // Stripe price ID for monthly
  stripeYearlyPriceId String? // Stripe price ID for yearly
  
  // Limits
  productLimit    Int      // -1 for unlimited
  apiCallLimit    Int?     // Optional API rate limit
  storageLimit    Int?     // Optional storage limit in MB
  
  // Features (stored as JSON for flexibility)
  features        Json     // Array of feature strings
  
  // Platform Access
  allowBigCommerce Boolean @default(true)
  allowShopify     Boolean @default(true)
  allowEtsy        Boolean @default(false)
  allowTikTok      Boolean @default(false)
  
  // Special Features
  allowBulkOps     Boolean @default(false)
  allowScheduledSync Boolean @default(false)
  allowAdvancedAnalytics Boolean @default(false)
  allowPrioritySupport Boolean @default(false)
  allowAPIAccess   Boolean @default(false)
  
  // Display
  isActive        Boolean @default(true)
  displayOrder    Int     @default(0)
  isPopular       Boolean @default(false)
  badgeText       String? // "Most Popular", "Best Value", etc.
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([tier])
  @@index([isActive, displayOrder])
}

// Email Logs (for tracking sent emails)
model EmailLog {
  id          String   @id @default(cuid())
  userId      String?  // Optional, for user-specific emails
  to          String
  subject     String
  template    String   // Template identifier
  status      String   // "sent", "failed", "bounced"
  provider    String   @default("resend")
  providerId  String?  // Provider's message ID
  error       String?  @db.Text
  metadata    Json?    // Additional context
  
  sentAt      DateTime @default(now())
  
  @@index([userId, sentAt])
  @@index([status])
  @@index([sentAt])
}
```

---

## Application Architecture

### Directory Structure

```
bigcommerce-api/
├── app/
│   ├── (auth)/                    # Auth routes group
│   │   ├── login/
│   │   └── signup/
│   ├── (marketing)/               # Public pages group
│   │   ├── page.tsx              # Homepage
│   │   ├── features/
│   │   └── pricing/
│   ├── (dashboard)/              # Protected routes group
│   │   ├── layout.tsx            # Dashboard layout
│   │   ├── page.tsx              # Dashboard home
│   │   ├── products/             # Product management
│   │   ├── credentials/          # API credentials
│   │   ├── settings/             # User settings
│   │   └── billing/              # Subscription management
│   ├── admin/                    # Admin-only routes
│   │   ├── layout.tsx
│   │   ├── users/
│   │   ├── subscriptions/
│   │   └── analytics/
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth routes
│       ├── stripe/
│       │   ├── webhooks/
│       │   ├── create-checkout/
│       │   └── portal/
│       ├── products/             # Product CRUD
│       ├── sync/                 # Sync operations
│       ├── search/               # Meilisearch proxy
│       └── admin/                # Admin API routes
├── components/
│   ├── auth/                     # Auth components
│   ├── marketing/                # Landing page components
│   ├── dashboard/                # Dashboard components
│   ├── admin/                    # Admin components
│   └── ui/                       # shadcn/ui components (existing)
├── lib/
│   ├── auth/                     # Auth utilities
│   │   ├── auth.ts              # NextAuth config
│   │   ├── session.ts           # Session helpers
│   │   └── permissions.ts       # RBAC logic
│   ├── stripe/                   # Stripe integration
│   │   ├── client.ts
│   │   ├── webhooks.ts
│   │   └── subscriptions.ts
│   ├── meilisearch/             # Search integration
│   │   ├── client.ts
│   │   └── indexer.ts
│   ├── platforms/               # Platform integrations
│   │   ├── bigcommerce/
│   │   ├── shopify/
│   │   ├── etsy/
│   │   └── tiktok/
│   ├── encryption/              # API key encryption
│   ├── email/                   # Email templates
│   └── utils.ts                 # Shared utilities
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.ts                # Auth & route protection
└── .env.example
```

---

## Feature Implementation Plan

### Phase 1: Authentication & User Management

#### 1.1 NextAuth.js Setup
- Configure Google OAuth provider
- Set up credentials provider with bcrypt
- Implement JWT session strategy
- Create login/signup flows with modal UI

#### 1.2 User Registration Flow
```mermaid
graph LR
    A[User visits site] --> B{Has account?}
    B -->|No| C[Click Sign Up]
    C --> D{Choose method}
    D -->|Google| E[OAuth redirect]
    D -->|Email| F[Enter credentials]
    E --> G[Create User + Account]
    F --> H[Hash password]
    H --> G
    G --> I[Create FREE subscription]
    I --> J[Send welcome email]
    J --> K[Redirect to dashboard]
```

#### 1.3 Role-Based Access Control
- Middleware for route protection
- Admin-only routes with role check
- API route authorization helpers

### Phase 2: Subscription & Billing

#### 2.1 Stripe Integration
```typescript
// Initial Pricing Plans (Admin can modify via dashboard)
const INITIAL_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    productLimit: 10,
    features: [
      '10 products per month',
      'BigCommerce integration',
      'Shopify integration',
      'Basic support',
      'Email notifications'
    ],
    platforms: {
      bigCommerce: true,
      shopify: true,
      etsy: false,
      tiktok: false
    }
  },
  STARTER: {
    name: 'Starter',
    price: 29.99,
    yearlyPrice: 299.99, // ~17% discount
    productLimit: 100,
    features: [
      '100 products per month',
      'BigCommerce integration',
      'Shopify integration',
      'Priority email support',
      'Basic analytics',
      'Bulk operations'
    ],
    platforms: {
      bigCommerce: true,
      shopify: true,
      etsy: false,
      tiktok: false
    },
    isPopular: true
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 99.99,
    yearlyPrice: 999.99, // ~17% discount
    productLimit: 1000,
    features: [
      '1000 products per month',
      'All marketplace integrations',
      'Etsy import',
      'TikTok Shop export',
      'Advanced analytics',
      'Bulk operations',
      'Scheduled syncs',
      'Priority support',
      'API access'
    ],
    platforms: {
      bigCommerce: true,
      shopify: true,
      etsy: true,
      tiktok: true
    },
    specialFeatures: {
      bulkOps: true,
      scheduledSync: true,
      advancedAnalytics: true,
      prioritySupport: true,
      apiAccess: true
    }
  }
}
```

**Note**: Admin can modify pricing, features, and limits through the admin dashboard. Changes are stored in the `PricingPlan` table.

#### 2.2 Usage Tracking & Enforcement
- Track product operations per billing period
- Prevent operations when limit reached
- Show usage progress in UI
- Auto-upgrade prompts

#### 2.3 Webhook Handling
```typescript
// Stripe Events to Handle
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

### Phase 3: Homepage & Marketing

#### 3.1 Landing Page Components
- **Hero Section**
  - Compelling headline: "Manage All Your Marketplace Listings in One Place"
  - Subheadline highlighting key benefit
  - CTA buttons: "Start Free" & "View Pricing"
  - Hero image/animation showing dashboard

- **Features Section**
  - Multi-marketplace support (icons for each platform)
  - Automated workflows
  - Real-time sync
  - Advanced search

- **Pricing Section**
  - Side-by-side plan comparison
  - Highlighted popular plan
  - Monthly/yearly toggle
  - Clear feature lists

- **Social Proof**
  - Testimonials (once you have customers)
  - Platform logos
  - Stats (products managed, time saved, etc.)

- **Footer**
  - Links: Features, Pricing, Docs, Support
  - Social media
  - Legal: Terms, Privacy

### Phase 4: Dashboard & Core Features

#### 4.1 Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│  Logo    [Search Products...]    [User Menu]    │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │        Main Content Area             │
│  - Home  │                                       │
│  - Prod  │    [Active content based on route]   │
│  - Cred  │                                       │
│  - Sync  │                                       │
│  - Bill  │                                       │
│  - Set   │                                       │
│          │                                       │
│ [Usage]  │                                       │
│  50/100  │                                       │
└──────────┴──────────────────────────────────────┘
```

#### 4.2 Product Management
- **List View**
  - Table with sorting/filtering
  - Platform badges
  - Status indicators
  - Bulk actions
  - Pagination (50 items per page)

- **Search & Filters**
  - Meilisearch integration
  - Instant results
  - Filters: Platform, Category, Price range, Status
  - Sort: Name, Date, Price

- **Product Detail**
  - Full product information
  - Image gallery
  - Variant management
  - Sync history
  - Edit capability

#### 4.3 Credentials Management
```
Platform Credentials Page

┌─────────────────────────────────────────────────┐
│  BigCommerce                          [+ Add]    │
│  ┌────────────────────────────────────────────┐ │
│  │ 🔐 Production Store (Active)     [Edit] [×] │ │
│  │    Store: my-store.mybigcommerce.com        │ │
│  │    Added: Jan 15, 2025                      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Shopify                              [+ Add]    │
│  ┌────────────────────────────────────────────┐ │
│  │ 🔐 Main Shop (Active)            [Edit] [×] │ │
│  │    Shop: my-shop.myshopify.com              │ │
│  │    Added: Jan 20, 2025                      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Etsy                    🔒 ENTERPRISE ONLY      │
│  TikTok Shop             🔒 ENTERPRISE ONLY      │
└─────────────────────────────────────────────────┘
```

### Phase 5: Platform Integrations

#### 5.1 Credential Encryption
```typescript
// Use AES-256-GCM for API key encryption
// Store encryption key in environment variable
// Never expose raw keys in responses
```

#### 5.2 Platform Adapters
Each platform needs:
- **Authentication**: Store/validate credentials
- **Product Fetch**: Get products from platform
- **Product Push**: Create/update products
- **Sync Logic**: Handle differences between platforms
- **Rate Limiting**: Respect API limits
- **Error Handling**: Platform-specific errors

#### 5.3 Sync Operations
```typescript
// Import from Etsy (Enterprise only)
1. Authenticate with Etsy API
2. Fetch shop listings
3. Transform to common format
4. Store in database
5. Index in Meilisearch
6. Show in user's products

// Export to TikTok (Enterprise only)
1. Select products
2. Transform to TikTok format
3. Generate Excel file
4. Download or auto-upload
5. Track export job
```

### Phase 6: Admin Panel

#### 6.1 Admin Dashboard
- **User Management**
  - List all users
  - View user details
  - Override subscription limits
  - Grant special features
  - Suspend/activate accounts

- **Subscription Management**
  - Active subscriptions
  - Revenue metrics
  - Churn analytics
  - Manual subscription control

- **System Metrics**
  - Total users
  - Active subscriptions by tier
  - API usage statistics
  - Error rates
  - Platform sync health

#### 6.2 Admin Actions
- Override product limits per user
- Grant enterprise features to any user
- View detailed usage logs
- Manual subscription updates
- System health monitoring

### Phase 7: Search Implementation

#### 7.1 Meilisearch Setup
```typescript
// Docker deployment
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-master-key \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest

// Index configuration
{
  searchableAttributes: ['name', 'description', 'sku', 'tags'],
  filterableAttributes: ['platform', 'price', 'categories'],
  sortableAttributes: ['createdAt', 'price', 'name'],
  displayedAttributes: ['id', 'name', 'price', 'platform', 'images']
}
```

#### 7.2 Indexing Strategy
- Index on product create/update
- Batch indexing for bulk operations
- Background job for re-indexing
- Handle partial updates efficiently

---

## Security Considerations

### Authentication
- Bcrypt for password hashing (cost factor: 12)
- JWT with short expiration (15 min access, 7 day refresh)
- Secure HTTP-only cookies
- CSRF protection

### API Security
- Rate limiting per user/IP
- Input validation with Zod
- SQL injection prevention (Prisma handles this)
- XSS protection (React handles this)

### Credential Storage
- AES-256-GCM encryption for API keys
- Environment variable for encryption key
- Never log sensitive data
- Secure credential transmission

### Payment Security
- Use Stripe's hosted checkout
- Verify webhooks with signature
- Never store card details
- PCI compliance through Stripe

---

## Performance Optimization

### Database
```sql
-- Essential Indexes
CREATE INDEX idx_products_user_platform ON products(user_id, platform);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_usage_user_date ON usage_records(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Caching Strategy
- Redis for session storage
- Cache product counts per user
- Cache subscription status
- Invalidate on updates

### Query Optimization
- Use Prisma's `select` to fetch only needed fields
- Pagination for all lists
- Cursor-based pagination for infinite scroll
- Eager loading with `include` where appropriate

### Search Performance
- Meilisearch handles millisecond searches
- Index asynchronously
- Cache popular search results
- Use pagination (50 results per page)

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tekms_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here-min-32-chars"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Meilisearch
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_MASTER_KEY="your-master-key"

# Encryption (for API keys)
ENCRYPTION_KEY="generate-32-byte-random-string"

# Email (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@tekmslisting.com"
FROM_NAME="TEKMS Listing Manager"
SUPPORT_EMAIL="support@tekmslisting.com"

# Admin Account (Initial Setup)
INITIAL_ADMIN_EMAIL="gokhansancar@gmail.com"
INITIAL_ADMIN_PASSWORD="123456789Gs_"

# Platform APIs (for testing)
BIGCOMMERCE_STORE_HASH=""
BIGCOMMERCE_ACCESS_TOKEN=""

# App Configuration
APP_NAME="TEKMS Listing Manager"
APP_URL="https://tekmslisting.com"
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured in Vercel
- [ ] PostgreSQL database provisioned (Vercel Postgres or Railway)
- [ ] Meilisearch instance deployed (Railway or self-hosted)
- [ ] Stripe products and prices created
- [ ] Domain configured
- [ ] SSL certificates (auto via Vercel)

### Vercel Configuration
```json
{
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Post-Deployment
- [ ] Run database migrations
- [ ] Create admin user
- [ ] Test payment flow
- [ ] Test OAuth login
- [ ] Verify webhooks
- [ ] Setup monitoring (Sentry/LogRocket)
- [ ] Configure analytics (PostHog/Plausible)

---

## Testing Strategy

### Unit Tests
- Auth helpers
- Permission checks
- Subscription logic
- Platform adapters

### Integration Tests
- API routes
- Database operations
- Stripe webhooks
- Search functionality

### E2E Tests
- User registration flow
- Subscription upgrade
- Product creation
- Sync operations

---

## Future Enhancements

### Phase 8+
- [ ] Mobile responsive optimization
- [ ] Progressive Web App (PWA)
- [ ] Bulk CSV import/export
- [ ] Scheduled syncs (cron jobs)
- [ ] Product templates
- [ ] Multi-user workspaces/teams
- [ ] API for third-party integrations
- [ ] White-label options
- [ ] Marketplace insights/analytics
- [ ] AI-powered product descriptions
- [ ] Image optimization service
- [ ] Inventory management
- [ ] Order management
- [ ] Internationalization (i18n)

---

## Success Metrics

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Conversion rate (free to paid)

### Technical Metrics
- API response time (< 200ms p95)
- Search latency (< 50ms)
- Error rate (< 0.1%)
- Uptime (99.9%)
- Database query performance

### User Metrics
- Daily Active Users (DAU)
- Products managed per user
- Feature adoption rates
- Support ticket volume
- User satisfaction score

---

## Timeline Estimate

### MVP (6-8 weeks)
- **Week 1-2**: Auth + Database setup
- **Week 3-4**: Homepage + Dashboard + Billing
- **Week 5-6**: Product management + Search
- **Week 7-8**: Platform integrations + Testing

### Production Ready (10-12 weeks)
- MVP + Polish + Admin panel + Documentation

---

## Design System - Color Palette

### Primary Colors (Teal/Cyan - Modern & Professional)
```css
:root {
  /* Primary - Teal/Cyan */
  --primary-50: #f0fdfa;
  --primary-100: #ccfbf1;
  --primary-200: #99f6e4;
  --primary-300: #5eead4;
  --primary-400: #2dd4bf;
  --primary-500: #14b8a6; /* Main brand color */
  --primary-600: #0d9488;
  --primary-700: #0f766e;
  --primary-800: #115e59;
  --primary-900: #134e4a;
  
  /* Secondary - Deep Blue */
  --secondary-500: #3b82f6;
  --secondary-600: #2563eb;
  
  /* Accent - Purple */
  --accent-500: #a855f7;
  --accent-600: #9333ea;
  
  /* Grays */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;
  
  /* Status Colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Typography
- **Font Family**: Inter (primary), SF Pro Display (headings)
- **Headings**: Bold, tight letter-spacing
- **Body**: Regular, comfortable line-height (1.6)

### Components Style
- **Rounded corners**: 8px (buttons), 12px (cards)
- **Shadows**: Subtle, layered
- **Buttons**: Solid primary color with hover states
- **Inputs**: Border with focus ring (primary color)
- **Cards**: White background with subtle shadow

---

## Next Steps

Once you approve this plan:

1. I'll switch to **Code mode** to begin implementation
2. We'll start with Phase 1 (Authentication)
3. Each phase will be completed iteratively
4. You'll review and test after each major component
5. We'll adjust based on your feedback

## Email Templates to Create

### 1. Welcome Email
- **Subject**: "Welcome to TEKMS Listing Manager! 🎉"
- **Content**: Account confirmation, getting started guide, link to dashboard

### 2. Email Verification
- **Subject**: "Verify your TEKMS email address"
- **Content**: Verification link (expires in 24h)

### 3. Password Reset
- **Subject**: "Reset your TEKMS password"
- **Content**: Reset link (expires in 1h)

### 4. Subscription Confirmation
- **Subject**: "Your [Plan Name] subscription is active!"
- **Content**: Plan details, next billing date, features unlocked

### 5. Payment Success
- **Subject**: "Payment received - Thank you!"
- **Content**: Receipt, invoice PDF, billing details

### 6. Payment Failed
- **Subject**: "Action required: Payment failed"
- **Content**: Update payment method link, retry instructions

### 7. Subscription Upgraded
- **Subject**: "You've upgraded to [Plan Name]!"
- **Content**: New features, prorated billing, next steps

### 8. Subscription Downgraded
- **Subject**: "Your plan has been changed"
- **Content**: New limits, effective date, data retention info

### 9. Usage Warning (80%)
- **Subject**: "You've used 80% of your monthly product limit"
- **Content**: Current usage, plan limit, upgrade CTA

### 10. Usage Limit Reached
- **Subject**: "Monthly product limit reached"
- **Content**: Upgrade options, limit reset date

### 11. Monthly Summary
- **Subject**: "Your TEKMS monthly summary"
- **Content**: Products managed, platforms used, top actions

### 12. Account Suspended
- **Subject**: "TEKMS account suspended"
- **Content**: Reason, resolution steps, support contact

---

## Initial Setup Script

```typescript
// scripts/setup-admin.ts
// Run after first deployment to create admin account and pricing plans

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Setting up TEKMS Listing Manager...')
  
  // 1. Create admin user
  const hashedPassword = await bcrypt.hash('123456789Gs_', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'gokhansancar@gmail.com' },
    update: {},
    create: {
      email: 'gokhansancar@gmail.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Admin user created:', admin.email)
  
  // 2. Create free subscription for admin
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      tier: 'FREE',
      status: 'ACTIVE',
    },
  })
  console.log('✅ Admin subscription created')
  
  // 3. Create pricing plans
  const plans = [
    {
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for testing and small projects',
      price: 0,
      productLimit: 10,
      features: [
        '10 products per month',
        'BigCommerce integration',
        'Shopify integration',
        'Basic support',
        'Email notifications'
      ],
      allowBigCommerce: true,
      allowShopify: true,
      displayOrder: 1,
    },
    {
      tier: 'STARTER',
      name: 'Starter',
      description: 'Great for growing businesses',
      price: 29.99,
      yearlyPrice: 299.99,
      productLimit: 100,
      features: [
        '100 products per month',
        'BigCommerce integration',
        'Shopify integration',
        'Priority email support',
        'Basic analytics',
        'Bulk operations'
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowBulkOps: true,
      isPopular: true,
      badgeText: 'Most Popular',
      displayOrder: 2,
    },
    {
      tier: 'PROFESSIONAL',
      name: 'Professional',
      description: 'For serious marketplace sellers',
      price: 99.99,
      yearlyPrice: 999.99,
      productLimit: 1000,
      features: [
        '1000 products per month',
        'All marketplace integrations',
        'Etsy import',
        'TikTok Shop export',
        'Advanced analytics',
        'Bulk operations',
        'Scheduled syncs',
        'Priority support',
        'API access'
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: true,
      allowPrioritySupport: true,
      allowAPIAccess: true,
      displayOrder: 3,
    },
  ]
  
  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    })
    console.log(`✅ ${plan.name} plan created`)
  }
  
  console.log('🎉 Setup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Confirmed Requirements Summary

✅ **Platform Name**: TEKMS Listing Manager
✅ **Pricing**: Free, $29.99/mo, $99.99/mo (admin manageable)
✅ **Admin Account**: gokhansancar@gmail.com
✅ **Color Scheme**: Modern teal/cyan gradient
✅ **Email Service**: Resend with comprehensive templates
✅ **Dynamic Pricing**: Admin can modify plans and features
✅ **Email Notifications**: Full suite of transactional emails

**Ready to switch to Code mode and start implementation!** 🚀