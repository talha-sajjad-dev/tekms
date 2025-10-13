import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

/**
 * Preview sync - Check how many products will be added without actually syncing
 * GET /api/stores/[id]/preview
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    
    const accessToken = decrypt(store.accessToken)
    let productCount = 0
    
    // Get product count from platform
    try {
      switch (store.platform) {
        case 'BIGCOMMERCE':
          const bcRes = await fetch(
            `https://api.bigcommerce.com/stores/${store.externalStoreId}/v3/catalog/summary`,
            {
              headers: {
                'X-Auth-Token': accessToken,
                'Accept': 'application/json'
              }
            }
          )
          if (bcRes.ok) {
            const data = await bcRes.json()
            productCount = data.data?.inventory_count || 0
          }
          break
          
        case 'SHOPIFY':
          const shopRes = await fetch(
            `https://${store.storeUrl}/admin/api/2024-01/products/count.json`,
            {
              headers: {
                'X-Shopify-Access-Token': accessToken
              }
            }
          )
          if (shopRes.ok) {
            const data = await shopRes.json()
            productCount = data.count || 0
          }
          break
          
        default:
          productCount = 0
      }
    } catch (error) {
      console.error('Error fetching product count:', error)
    }
    
    // Get current products for THIS STORE only
    const currentStoreProductCount = await db.product.count({
      where: {
        userId: session.user.id,
        storeConnectionId: params.id
      }
    })
    
    // Get all store pricing tiers
    const pricingTiers = await db.storePricingTier.findMany({
      where: { isActive: true },
      orderBy: { minProducts: 'asc' }
    })
    
    // Calculate which tier THIS STORE will need based on its product count
    const storeProductTotal = productCount // Products in the store platform
    const requiredTier = pricingTiers.find(tier =>
      storeProductTotal >= tier.minProducts && (tier.maxProducts === -1 || storeProductTotal <= tier.maxProducts)
    ) || pricingTiers[pricingTiers.length - 1]
    
    // Get current store subscription
    const storeSubscription = await db.storeSubscription.findFirst({
      where: { storeConnectionId: params.id },
      include: { pricingTier: true }
    })
    
    // Check user-level subscription for platform access
    const userSubscription = await db.subscription.findUnique({
      where: { userId: session.user.id }
    })
    
    const canAccessPlatform = userSubscription?.tier !== 'FREE' || store.platform === 'BIGCOMMERCE'
    
    return NextResponse.json({
      platformProductCount: productCount,
      currentStoreProducts: currentStoreProductCount,
      newStoreTotal: storeProductTotal,
      currentStoreTier: storeSubscription ? {
        name: storeSubscription.pricingTier.name,
        price: Number(storeSubscription.pricingTier.monthlyPrice)
      } : null,
      requiredTier: requiredTier ? {
        name: requiredTier.name,
        minProducts: requiredTier.minProducts,
        maxProducts: requiredTier.maxProducts,
        monthlyPrice: Number(requiredTier.monthlyPrice),
        yearlyPrice: requiredTier.yearlyPrice ? Number(requiredTier.yearlyPrice) : null
      } : null,
      needsStoreUpgrade: storeSubscription ?
        storeProductTotal > (storeSubscription.pricingTier.maxProducts === -1 ? Infinity : storeSubscription.pricingTier.maxProducts)
        : true,
      needsUserUpgrade: !canAccessPlatform,
      userTier: userSubscription?.tier || 'FREE',
      storeName: store.storeName,
      platform: store.platform,
      message: !canAccessPlatform ?
        `Upgrade to PAID to access ${store.platform}` :
        storeSubscription ?
          `This store will be billed at ${requiredTier?.monthlyPrice || 0}/month for ${storeProductTotal} products` :
          `New store billing: ${requiredTier?.monthlyPrice || 0}/month`
    })
  } catch (error) {
    console.error('Error previewing sync:', error)
    return NextResponse.json(
      { error: 'Failed to preview sync' },
      { status: 500 }
    )
  }
}