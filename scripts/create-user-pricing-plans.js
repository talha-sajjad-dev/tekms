require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('💰 Creating User-Level Pricing Plans...\n')
  
  // These are USER-LEVEL subscription tiers (not per-store)
  // They control platform access and features
  const plans = [
    {
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for testing',
      price: 0,
      yearlyPrice: 0,
      productLimit: 10, // Total across all stores
      features: ['1 store', '10 products total', 'BigCommerce only', 'Basic support'],
      allowBigCommerce: true,
      allowShopify: false,
      allowEtsy: false,
      allowTikTok: false,
      allowBulkOps: false,
      allowScheduledSync: false,
      allowAdvancedAnalytics: false,
      allowAPIAccess: false,
      isActive: true,
      displayOrder: 0
    },
    {
      tier: 'PAID',
      name: 'Professional',
      description: 'For growing businesses - per-store billing',
      price: 0, // Per-store pricing applies
      yearlyPrice: 0,
      productLimit: -1, // Unlimited (billed per store based on product count)
      features: [
        'Unlimited stores',
        'Pay per store based on product count',
        'All platforms (BigCommerce, Shopify, Etsy, TikTok)',
        'Bulk operations',
        'Scheduled syncs',
        'Priority support'
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: false,
      allowAPIAccess: false,
      isActive: true,
      displayOrder: 1
    },
    {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Custom solutions for large operations',
      price: 0, // Custom pricing
      yearlyPrice: 0,
      productLimit: -1, // Unlimited
      features: [
        'Everything in Professional',
        'Advanced analytics',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee'
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: true,
      allowAPIAccess: true,
      isActive: true,
      displayOrder: 2
    }
  ]
  
  for (const planData of plans) {
    try {
      const existing = await prisma.pricingPlan.findUnique({
        where: { tier: planData.tier }
      })
      
      if (existing) {
        const updated = await prisma.pricingPlan.update({
          where: { tier: planData.tier },
          data: planData
        })
        console.log(`✅ Updated: ${updated.name} (${updated.tier})`)
      } else {
        const created = await prisma.pricingPlan.create({
          data: planData
        })
        console.log(`✅ Created: ${created.name} (${created.tier})`)
      }
    } catch (error) {
      console.error(`❌ Failed for ${planData.name}:`, error.message)
    }
  }
  
  console.log('\n✅ User-level pricing plans created!')
  
  // Verify
  const allPlans = await prisma.pricingPlan.findMany({
    orderBy: { displayOrder: 'asc' }
  })
  
  console.log(`\n📊 Total pricing plans: ${allPlans.length}`)
  allPlans.forEach(p => {
    console.log(`  - ${p.name} (${p.tier}): Products=${p.productLimit === -1 ? '∞' : p.productLimit}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())