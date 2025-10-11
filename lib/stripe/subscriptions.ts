import { getStripe } from './client'
import { db } from '@/lib/db'

/**
 * Create or get Stripe customer for user
 */
export async function getOrCreateStripeCustomer(userId: string, email: string, name?: string | null) {
  // Check if user already has a Stripe customer
  const subscription = await db.subscription.findUnique({
    where: { userId }
  })
  
  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId
  }
  
  // Create new Stripe customer
  const stripe = await getStripe()
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId
    }
  })
  
  // Update subscription with customer ID
  await db.subscription.update({
    where: { userId },
    data: { stripeCustomerId: customer.id }
  })
  
  return customer.id
}

/**
 * Create per-store subscription in Stripe
 * @param storeConnectionId - Store connection ID
 * @param pricingTierId - Pricing tier ID
 * @param userId - User ID
 */
export async function createStoreSubscription(
  storeConnectionId: string,
  pricingTierId: string,
  userId: string
) {
  // Get user and pricing tier
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  const pricingTier = await db.storePricingTier.findUnique({
    where: { id: pricingTierId }
  })
  
  if (!pricingTier) {
    throw new Error('Pricing tier not found')
  }
  
  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(userId, user.email, user.name)
  
  // Create Stripe subscription
  const stripe = await getStripe()
  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: pricingTier.stripePriceId || undefined, // You'll need to create these in Stripe dashboard
      quantity: 1
    }],
    metadata: {
      storeConnectionId,
      userId,
      pricingTierId,
      tierName: pricingTier.name
    },
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent']
  })
  
  // Create store subscription in database
  const storeSubscription = await db.storeSubscription.create({
    data: {
      storeConnectionId,
      userId,
      pricingTierId,
      productCount: 0,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: pricingTier.stripePriceId,
      status: 'ACTIVE'
    }
  })
  
  return {
    storeSubscription,
    stripeSubscription,
    clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret
  }
}

/**
 * Upgrade store subscription to higher tier
 * @param storeSubscriptionId - Store subscription ID
 * @param newPricingTierId - New pricing tier ID
 */
export async function upgradeStoreSubscription(
  storeSubscriptionId: string,
  newPricingTierId: string
) {
  const storeSub = await db.storeSubscription.findUnique({
    where: { id: storeSubscriptionId },
    include: { pricingTier: true }
  })
  
  if (!storeSub) {
    throw new Error('Store subscription not found')
  }
  
  const newTier = await db.storePricingTier.findUnique({
    where: { id: newPricingTierId }
  })
  
  if (!newTier) {
    throw new Error('New pricing tier not found')
  }
  
  // Update Stripe subscription
  if (storeSub.stripeSubscriptionId) {
    const stripe = await getStripe()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      storeSub.stripeSubscriptionId
    )
    
    await stripe.subscriptions.update(storeSub.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newTier.stripePriceId || undefined,
      }],
      proration_behavior: 'create_prorations', // Prorate the upgrade
    })
  }
  
  // Update database
  await db.storeSubscription.update({
    where: { id: storeSubscriptionId },
    data: {
      pricingTierId: newPricingTierId,
      stripePriceId: newTier.stripePriceId
    }
  })
  
  return { success: true, oldTier: storeSub.pricingTier.name, newTier: newTier.name }
}

/**
 * Cancel store subscription
 * @param storeSubscriptionId - Store subscription ID
 */
export async function cancelStoreSubscription(storeSubscriptionId: string) {
  const storeSub = await db.storeSubscription.findUnique({
    where: { id: storeSubscriptionId }
  })
  
  if (!storeSub) {
    throw new Error('Store subscription not found')
  }
  
  // Cancel in Stripe
  if (storeSub.stripeSubscriptionId) {
    const stripe = await getStripe()
    await stripe.subscriptions.cancel(storeSub.stripeSubscriptionId)
  }
  
  // Delete from database
  await db.storeSubscription.delete({
    where: { id: storeSubscriptionId }
  })
  
  return { success: true }
}

/**
 * Auto-upgrade store subscription based on product count
 * @param storeConnectionId - Store connection ID
 * @param newProductCount - New total product count
 */
export async function autoUpgradeStoreIfNeeded(
  storeConnectionId: string,
  newProductCount: number
) {
  const store = await db.storeConnection.findUnique({
    where: { id: storeConnectionId },
    include: {
      storeSubscription: {
        include: { pricingTier: true }
      }
    }
  })
  
  if (!store?.storeSubscription) {
    return { upgraded: false, reason: 'No subscription found' }
  }
  
  const currentTier = store.storeSubscription.pricingTier
  
  // Check if product count exceeds current tier max
  if (currentTier.maxProducts !== -1 && newProductCount > currentTier.maxProducts) {
    // Find appropriate tier
    const newTier = await db.storePricingTier.findFirst({
      where: {
        AND: [
          { minProducts: { lte: newProductCount } },
          {
            OR: [
              { maxProducts: { gte: newProductCount } },
              { maxProducts: -1 } // Unlimited
            ]
          },
          { isActive: true }
        ]
      },
      orderBy: { displayOrder: 'asc' }
    })
    
    if (!newTier) {
      throw new Error('No pricing tier available for product count. Contact support.')
    }
    
    // Upgrade subscription
    await upgradeStoreSubscription(store.storeSubscription.id, newTier.id)
    
    // Update product count
    await db.storeConnection.update({
      where: { id: storeConnectionId },
      data: { productCount: newProductCount }
    })
    
    await db.storeSubscription.update({
      where: { id: store.storeSubscription.id },
      data: { productCount: newProductCount }
    })
    
    return {
      upgraded: true,
      oldTier: currentTier.name,
      newTier: newTier.name,
      oldPrice: currentTier.monthlyPrice,
      newPrice: newTier.monthlyPrice
    }
  }
  
  // Just update product count
  await db.storeConnection.update({
    where: { id: storeConnectionId },
    data: { productCount: newProductCount }
  })
  
  await db.storeSubscription.update({
    where: { id: store.storeSubscription.id },
    data: { productCount: newProductCount }
  })
  
  return { upgraded: false }
}

/**
 * Get user's total monthly bill (sum of all store subscriptions)
 */
export async function getUserTotalBill(userId: string): Promise<{
  total: number
  stores: Array<{
    id: string
    storeName: string
    platform: string
    productCount: number
    tierName: string
    price: number
  }>
}> {
  const stores = await db.storeConnection.findMany({
    where: { userId, isActive: true },
    include: {
      storeSubscription: {
        include: { pricingTier: true }
      }
    }
  })
  
  const storeDetails = stores
    .filter((s) => s.storeSubscription)
    .map((s) => ({
      id: s.id,
      storeName: s.storeName,
      platform: s.platform,
      productCount: s.productCount,
      tierName: s.storeSubscription!.pricingTier.name,
      price: Number(s.storeSubscription!.pricingTier.monthlyPrice)
    }))
  
  const total = storeDetails.reduce((sum: number, store) => sum + store.price, 0)
  
  return { total, stores: storeDetails }
}