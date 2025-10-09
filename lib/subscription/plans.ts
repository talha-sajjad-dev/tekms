export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    productLimit: 10,
    credentialsPerPlatform: 1,
    features: [
      '10 products per month',
      'All platform integrations',
      '1 credential per platform',
      'Email support',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    productLimit: 500,
    credentialsPerPlatform: 3,
    features: [
      '500 products per month',
      'All platform integrations',
      'Up to 3 credentials per platform',
      'Bulk operations',
      'Priority email support',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    productLimit: 5000,
    credentialsPerPlatform: 10,
    features: [
      '5,000 products per month',
      'All platform integrations',
      'Up to 10 credentials per platform',
      'Bulk operations',
      'Advanced analytics',
      'Priority support',
      'Custom workflows',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    productLimit: -1, // unlimited
    credentialsPerPlatform: -1, // unlimited
    features: [
      'Unlimited products',
      'All platform integrations',
      'Unlimited credentials',
      'Bulk operations',
      'Advanced analytics',
      'Dedicated support',
      'Custom workflows',
      'API access',
      'White-label options',
    ],
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

export function getTierLimits(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier]
}

export function canPerformOperation(currentUsage: number, tier: SubscriptionTier): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].productLimit
  if (limit === -1) return true // unlimited
  return currentUsage < limit
}