# TEKMS - Stripe Integration Guide

## 🎯 Overview

This guide explains how to integrate Stripe for subscription payments in TEKMS Listing Manager. The platform is already configured to be Stripe-ready - you just need to add your API keys.

---

## 📋 Prerequisites

1. Stripe account (https://stripe.com)
2. Admin access to TEKMS (https://tekms.com/admin)
3. Domain verified in Stripe dashboard

---

## 🔧 Step 1: Get Stripe API Keys

### 1.1 Create Stripe Account
- Go to https://stripe.com and create an account
- Complete business verification

### 1.2 Get API Keys
1. Login to Stripe Dashboard
2. Click "Developers" in left sidebar
3. Click "API keys"
4. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### 1.3 Test vs Live Mode
- **Test Mode**: For development and testing (use test cards)
- **Live Mode**: For production (real payments)

Start with **Test Mode** keys!

---

## 🎨 Step 2: Create Products in Stripe

### 2.1 Create Products for Each Tier

**Go to**: Stripe Dashboard → Products → Create Product

Create these three products:

#### Professional Plan
- Name: TEKMS Professional
- Description: Unlimited products, all platforms, bulk operations
- Pricing:
  - Monthly: $29.00 USD
  - Yearly (optional): $290 USD (save $58/year)

#### Enterprise Plan
- Name: TEKMS Enterprise
- Description: Everything + API access, custom integrations
- Pricing:
  - Monthly: $99.00 USD
  - Yearly (optional): $990 USD (save $198/year)

### 2.2 Copy Price IDs
After creating each product, copy the **Price ID** (starts with `price_`):
- Professional Monthly: `price_xxxxx`
- Enterprise Monthly: `price_xxxxx`

---

## ⚙️ Step 3: Configure TEKMS

### 3.1 Add Keys via Admin Panel

1. Login to https://tekms.com as admin
2. Go to `/admin`
3. Click "Settings" tab
4. Click "Stripe" sub-tab
5. Enter:
   - **Stripe Publishable Key**: `pk_test_xxxxx` or `pk_live_xxxxx`
   - **Stripe Secret Key**: `sk_test_xxxxx` or `sk_live_xxxxx`
6. Click Save for each field

### 3.2 Update Pricing Plans

1. In TEKMS admin, go to database or use Prisma Studio:

```bash
npx prisma studio
```

2. Update `PricingPlan` table:
   - Find **PROFESSIONAL** plan
   - Add `stripePriceId`: The monthly price ID from Stripe
   - Find **ENTERPRISE** plan
   - Add `stripePriceId`: The monthly price ID from Stripe

---

## 🪝 Step 4: Setup Webhooks

### 4.1 Create Webhook Endpoint

1. In Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://tekms.com/api/stripe/webhook`
4. Description: "TEKMS Subscription Events"

### 4.2 Select Events
Listen to these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `checkout.session.completed`

### 4.3 Get Webhook Secret
- After creating webhook, copy the **Signing secret** (starts with `whsec_`)
- Add to TEKMS Admin → Settings → Stripe → Webhook Secret

---

## 💻 Step 5: Update Code (If Needed)

The webhook handler needs to be created. Here's the implementation:

### Create Webhook Handler
File: `app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/db"
import { getSetting } from "@/lib/settings"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!
  
  const webhookSecret = await getSetting("stripe_webhook_secret")

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      // Update subscription in database
      break
    }
    
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      // Update subscription status and tier
      break
    }
    
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      // Downgrade to free tier
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## 🛒 Step 6: Create Checkout Flow

### Update Billing Page
File: `app/billing/page.tsx`

Replace the upgrade button onClick with:

```typescript
const handleUpgrade = async (tier: string, priceId: string) => {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, priceId }),
  })
  
  const { url } = await res.json()
  window.location.href = url
}
```

### Create Checkout Endpoint
File: `app/api/stripe/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { getSetting } from "@/lib/settings"

export async function POST(req: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { priceId, tier } = await req.json()
  
  const stripeSecretKey = await getSetting("stripe_secret_key")
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
    customer_email: session.user.email!,
    metadata: {
      userId: session.user.id,
      tier: tier,
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
```

---

## 🧪 Step 7: Test with Test Mode

### 7.1 Use Test Cards

Stripe provides test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

Any future expiry date and any CVC

### 7.2 Test Flow
1. Sign up as a test user
2. Go to /billing
3. Click "Upgrade to Professional"
4. Use test card: 4242 4242 4242 4242
5. Complete checkout
6. Verify subscription updated in dashboard

---

## 🚀 Step 8: Go Live

### 8.1 When Ready for Production
1. Complete Stripe business verification
2. Switch to **Live Mode** in Stripe
3. Get **Live API keys**
4. Update keys in TEKMS Admin → Settings
5. Recreate webhook with live endpoint
6. Update webhook secret
7. Test with real (small) purchase

### 8.2 Enable Stripe in TEKMS
In Admin → Settings → Stripe:
- Set **stripe_enabled** to `true`

---

## 📊 Subscription Flow

### How It Works:

1. **User clicks "Upgrade"** → `/billing`
2. **Checkout created** → Stripe Checkout page
3. **Payment processed** → Stripe charges card
4. **Webhook fired** → `customer.subscription.created`
5. **TEKMS updated** → User's tier upgraded in database
6. **User redirected** → Back to billing page
7. **Features unlocked** → Access to PRO/ENTERPRISE features

---

## 🔧 Current Setup (Database-Driven)

The Stripe configuration is stored in the `Settings` table:

```sql
SELECT * FROM "Settings" WHERE category = 'stripe';
```

Fields:
- `stripe_publishable_key` - For frontend (public)
- `stripe_secret_key` - For backend (private)
- `stripe_webhook_secret` - For webhook verification (private)
- `stripe_enabled` - Enable/disable payments (boolean)

Update these via Admin Panel → Settings!

---

## 💡 Tips

### Development
- Use Stripe CLI for local webhook testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### Testing
- Use test mode extensively
- Test all subscription scenarios
- Verify webhooks are firing
- Check database updates

### Security
- Never expose secret key in frontend
- Validate all webhook signatures
- Use environment-specific keys
- Monitor for suspicious activity

---

## 🐛 Troubleshooting

### Webhook Not Working
```bash
# Test webhook locally
stripe trigger customer.subscription.created

# Check webhook logs in Stripe Dashboard
```

### Payment Failing
- Check API keys are correct (test vs live)
- Verify webhook secret matches
- Check Stripe Dashboard for errors
- Review application logs: `pm2 logs tekms`

### Subscription Not Updating
- Verify webhook is configured
- Check webhook events are selected
- Review database logs
- Test webhook manually in Stripe

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs
- **TEKMS Support**: support@tekmslisting.com

---

## ✅ Checklist

Before going live:
- [ ] Stripe account created and verified
- [ ] Products created in Stripe
- [ ] API keys added to TEKMS settings
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to settings
- [ ] Test mode fully tested
- [ ] Live mode keys ready
- [ ] Payment flow tested
- [ ] Subscription updates working
- [ ] Error handling verified

---

**The platform is Stripe-ready!** Just add your keys via the admin panel.