# SaaS Transformation Plan
## Multi-Channel E-commerce Automation Platform

**Last Updated:** 2025-10-09  
**Status:** Architecture Phase

---

## Executive Summary

Transform the current BigCommerce API tool into a full-featured SaaS product with user authentication, credential management, subscription tiers, and a professional landing page.

**Key Features:**
- Google OAuth authentication
- DigitalOcean PostgreSQL database
- Stripe subscription management
- Free tier (10 products/month) and paid tiers
- Encrypted credential storage for BigCommerce, TikTok, and Etsy APIs
- Admin dashboard for user management
- Professional landing page

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Frontend
        LP[Landing Page]
        AUTH[Auth Modal]
        DASH[User Dashboard]
        ADMIN[Admin Panel]
        FEATURES[Product Features]
    end
    
    subgraph Backend
        NA[NextAuth.js]
        API[API Routes]
        STRIPE[Stripe Integration]
    end
    
    subgraph Database
        DO[(DigitalOcean PostgreSQL)]
    end
    
    subgraph External
        GOOGLE[Google OAuth]
        PAYMENT[Stripe]
        BC[BigCommerce API]
        TT[TikTok API]
        ETSY[Etsy API]
    end
    
    LP --> AUTH
    AUTH --> NA
    NA --> GOOGLE
    NA --> DO
    DASH --> API
    API --> DO
    API --> STRIPE
    STRIPE --> PAYMENT
    FEATURES --> BC
    FEATURES --> TT
    FEATURES --> ETSY
    ADMIN --> API
```

---

## Technology Stack

### Core Technologies
- **Framework:** Next.js 15.2.4 (App Router)
- **Language:** TypeScript
- **Database:** DigitalOcean PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5 (Auth.js)
- **Payments:** Stripe
- **Email:** Resend or SendGrid
- **UI:** Tailwind CSS + shadcn/ui components

### Required Dependencies
```json
{
  "dependencies": {
    "next-auth": "^5.0.0-beta.22",
    "@prisma/client": "^5.20.0",
    "stripe": "^16.0.0",
    "bcryptjs": "^2.4.3",
    "@t3-oss/env-nextjs": "^0.10.1",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

## Database Schema

### Prisma Schema (`prisma/schema.prisma`)

```prisma
// User Management
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  credentials   UserCredential[]
  subscription  Subscription?
  usage         UsageRecord[]
}

enum UserRole {
  USER
  ADMIN
}

// NextAuth tables
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Subscription Management
model Subscription {
  id                String             @id @default(cuid())
  userId            String             @unique
  stripeCustomerId  String?            @unique
  stripePriceId     String?
  stripeCurrentPeriodEnd DateTime?
  tier              SubscriptionTier   @default(FREE)
  status            SubscriptionStatus @default(ACTIVE)
  cancelAtPeriodEnd Boolean           @default(false)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
}

// API Credentials Storage
model UserCredential {
  id          String   @id @default(cuid())
  userId      String
  platform    Platform
  encryptedKey String  @db.Text
  label       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, platform, label])
}

enum Platform {
  BIGCOMMERCE
  TIKTOK
  ETSY
}

// Usage Tracking
model UsageRecord {
  id          String   @id @default(cuid())
  userId      String
  action      String
  productCount Int     @default(1)
  platform    Platform?
  metadata    Json?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

---

## Subscription Tiers

### Tier Definitions

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| **Price** | $0/mo | $29/mo | $79/mo | $199/mo |
| **Products/Month** | 10 | 500 | 5,000 | Unlimited |
| **Platforms** | All | All | All | All |
| **API Credentials** | 1 per platform | 3 per platform | 10 per platform | Unlimited |
| **Bulk Operations** | ❌ | ✅ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Custom Workflows** | ❌ | ❌ | ❌ | ✅ |
| **Dedicated Support** | ❌ | ❌ | ❌ | ✅ |

### Stripe Product IDs (to be created)

```typescript
export const STRIPE_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    productLimit: 10,
  },
  STARTER: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 29,
    productLimit: 500,
  },
  PROFESSIONAL: {
    name: 'Professional',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 79,
    productLimit: 5000,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    price: 199,
    productLimit: -1, // unlimited
  },
}
```

---

## Authentication Flow

### Google OAuth Integration

```mermaid
sequenceDiagram
    participant U as User
    participant LP as Landing Page
    participant NA as NextAuth
    participant G as Google
    participant DB as Database

    U->>LP: Click "Sign in with Google"
    LP->>NA: Trigger Google OAuth
    NA->>G: Redirect to Google
    G->>U: Request permissions
    U->>G: Grant permissions
    G->>NA: Return auth code
    NA->>G: Exchange for tokens
    G->>NA: Return user info
    NA->>DB: Create/Update user
    NA->>DB: Create session
    NA->>U: Redirect to dashboard
```

### NextAuth Configuration

**File:** `lib/auth/config.ts`

```typescript
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
```

---

## Landing Page Design

### Structure

1. **Hero Section**
   - Compelling headline: "Automate Your E-commerce Product Management"
   - Subheadline: "Seamlessly sync products across BigCommerce, TikTok, and Etsy"
   - CTA: "Get Started Free" → Opens auth modal
   - Hero image/animation

2. **Features Section**
   - BigCommerce Integration
   - TikTok Export Automation
   - Etsy Product Import
   - Bulk Operations
   - Real-time Sync
   - Analytics Dashboard

3. **How It Works**
   - Step 1: Connect your accounts
   - Step 2: Configure sync settings
   - Step 3: Automate your workflow

4. **Pricing Section**
   - Display all 4 tiers
   - "Start Free" CTA on each tier
   - Feature comparison table

5. **Social Proof**
   - Testimonials (if available)
   - Trust badges
   - Platform logos

6. **FAQ Section**

7. **Footer**
   - Links: Privacy Policy, Terms, Contact
   - Social media links

### Login Modal Component

**File:** `components/auth/login-modal.tsx`

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
          <p className="text-center text-muted-foreground">
            Sign in to manage your e-commerce products
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full"
            size="lg"
          >
            <Chrome className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## User Dashboard

### Dashboard Layout

**File:** `app/(dashboard)/layout.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/config'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardSidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1">
        <DashboardNav user={session.user} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
```

### Dashboard Sidebar Navigation

```typescript
const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Credentials', href: '/dashboard/credentials', icon: Key },
  { name: 'BigCommerce', href: '/dashboard/bigcommerce', icon: ShoppingCart },
  { name: 'TikTok Export', href: '/dashboard/tiktok', icon: Video },
  { name: 'Etsy Import', href: '/dashboard/etsy', icon: Package },
  { name: 'Usage & Limits', href: '/dashboard/usage', icon: Activity },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

// Admin only
if (user.role === 'ADMIN') {
  navigation.push({
    name: 'Admin Panel',
    href: '/admin',
    icon: Shield,
  })
}
```

---

## Credential Management

### Credential Storage Architecture

```mermaid
flowchart LR
    UI[User Interface] --> API[API Route]
    API --> ENC[Encryption Service]
    ENC --> DB[(Encrypted Storage)]
    DB --> DEC[Decryption Service]
    DEC --> USE[Use in API Calls]
```

### Encryption Service

**File:** `lib/encryption/credentials.ts`

```typescript
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32 bytes
const ALGORITHM = 'aes-256-gcm'

export function encryptCredential(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  )
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex'),
  })
}

export function decryptCredential(encryptedText: string): string {
  const { iv, data, tag } = JSON.parse(encryptedText)
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### Credentials API Route

**File:** `app/api/credentials/route.ts`

```typescript
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { encryptCredential } from '@/lib/encryption/credentials'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { platform, credentials, label } = await req.json()
  
  const encryptedKey = encryptCredential(JSON.stringify(credentials))
  
  const credential = await prisma.userCredential.create({
    data: {
      userId: session.user.id,
      platform,
      encryptedKey,
      label,
    },
  })

  return Response.json({ success: true, id: credential.id })
}
```

---

## Usage Tracking & Limits

### Usage Tracking Service

**File:** `lib/usage/tracker.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { Platform } from '@prisma/client'

export async function trackUsage(
  userId: string,
  action: string,
  productCount: number = 1,
  platform?: Platform
) {
  await prisma.usageRecord.create({
    data: {
      userId,
      action,
      productCount,
      platform,
    },
  })
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  })

  return records.reduce((sum, record) => sum + record.productCount, 0)
}

export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
  tier: string
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  const tier = subscription?.tier || 'FREE'
  const limit = STRIPE_PLANS[tier].productLimit
  const current = await getMonthlyUsage(userId)

  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
    tier,
  }
}
```

### Middleware for Protected Routes

**File:** `middleware.ts`

```typescript
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuth = !!token
  const isAuthPage = request.nextUrl.pathname === '/'
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')

  if (isDashboard && !isAuth) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isAdmin && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*'],
}
```

---

## Admin Dashboard

### Admin Overview Page

**File:** `app/admin/page.tsx`

Features:
- Total users count
- Active subscriptions by tier
- Monthly revenue chart
- Recent signups
- Usage statistics
- System health metrics

### User Management

**File:** `app/admin/users/page.tsx`

Features:
- User list with search/filter
- View user details
- Manually adjust subscription
- View user activity
- Suspend/activate accounts

---

## Stripe Integration

### Webhook Handler

**File:** `app/api/webhooks/stripe/route.ts`

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      // Handle successful subscription
      break
    case 'customer.subscription.updated':
      // Update subscription status
      break
    case 'customer.subscription.deleted':
      // Handle cancellation
      break
    case 'invoice.payment_failed':
      // Handle payment failure
      break
  }

  return Response.json({ received: true })
}
```

---

## Environment Variables

**File:** `.env.example`

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# Encryption
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# Email (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@yourdomain.com"

# Existing API Keys (for system use)
BIGCOMMERCE_CLIENT_ID="..."
BIGCOMMERCE_CLIENT_SECRET="..."
```

---

## File Structure

```
bigcommerce-api/
├── app/
│   ├── (landing)/
│   │   ├── page.tsx                 # Landing page
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx             # Dashboard home
│   │   │   ├── credentials/
│   │   │   ├── bigcommerce/
│   │   │   ├── tiktok/
│   │   │   ├── etsy/
│   │   │   ├── usage/
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── page.tsx                 # Admin dashboard
│   │   ├── users/
│   │   └── analytics/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── credentials/
│   │   ├── subscription/
│   │   ├── usage/
│   │   └── webhooks/stripe/
│   └── globals.css
├── components/
│   ├── auth/
│   │   ├── login-modal.tsx
│   │   └── user-menu.tsx
│   ├── dashboard/
│   │   ├── nav.tsx
│   │   ├── sidebar.tsx
│   │   └── usage-badge.tsx
│   ├── landing/
│   │   ├── hero.tsx
│   │   ├── features.tsx
│   │   ├── pricing.tsx
│   │   └── faq.tsx
│   └── ui/                          # Existing shadcn components
├── lib/
│   ├── auth/
│   │   └── config.ts
│   ├── encryption/
│   │   └── credentials.ts
│   ├── stripe/
│   │   └── client.ts
│   ├── usage/
│   │   └── tracker.ts
│   ├── email/
│   │   └── templates.ts
│   └── prisma.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.ts
└── .env.local
```

---

## Implementation Phases

### Phase 1: Database & Authentication (Week 1)
- [ ] Set up DigitalOcean PostgreSQL
- [ ] Configure Prisma
- [ ] Implement NextAuth with Google OAuth
- [ ] Create authentication middleware

### Phase 2: User Management (Week 1-2)
- [ ] Build user dashboard layout
- [ ] Implement credential storage system
- [ ] Create user settings page

### Phase 3: Subscription System (Week 2)
- [ ] Integrate Stripe
- [ ] Implement subscription tiers
- [ ] Create billing page
- [ ] Set up webhook handlers

### Phase 4: Usage Tracking (Week 2-3)
- [ ] Implement usage tracking
- [ ] Add limit enforcement
- [ ] Create usage analytics dashboard

### Phase 5: Landing Page (Week 3)
- [ ] Design and build landing page
- [ ] Create login modal
- [ ] Add pricing section

### Phase 6: Feature Updates (Week 3-4)
- [ ] Update all existing features for authentication
- [ ] Integrate user credentials into API calls
- [ ] Add usage tracking to all operations

### Phase 7: Admin Panel (Week 4)
- [ ] Build admin dashboard
- [ ] Add user management
- [ ] Create analytics views

### Phase 8: Testing & Launch (Week 4-5)
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Production deployment

---

## Security Considerations

1. **Credential Encryption**
   - Use AES-256-GCM encryption
   - Store encryption key in environment variables
   - Never log decrypted credentials

2. **API Route Protection**
   - Verify authentication on all protected routes
   - Implement rate limiting
   - Validate user permissions

3. **CSRF Protection**
   - NextAuth handles CSRF tokens
   - Use SameSite cookies

4. **Input Validation**
   - Validate all user inputs
   - Sanitize data before database operations

5. **Environment Variables**
   - Never commit .env files
   - Use different keys for dev/prod
   - Rotate secrets regularly

---

## Next Steps

1. Review and approve this architecture plan
2. Set up DigitalOcean PostgreSQL database
3. Configure environment variables
4. Begin Phase 1 implementation

---

## Questions for Clarification

1. Do you have a domain name for the production deployment?
2. What email service do you prefer (Resend, SendGrid, or other)?
3. Should we implement email/password authentication as a fallback, or Google OAuth only?
4. Do you want analytics integration (Google Analytics, Plausible, etc.)?
5. Any specific branding/design preferences for the landing page?