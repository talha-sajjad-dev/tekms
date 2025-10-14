require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('💰 Creating Pricing Plans...\n')
  
  const plans = [
    {
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for testing',
      price: 0,
      yearlyPrice: 0,
      productLimit: 10,
      features: JSON.stringify(['1 store', '10 products total', 'Basic support']),
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
      description: 'For growing businesses',
      price: 29.99,
      yearlyPrice: 299.99,
      productLimit: -1, // unlimited
      features: JSON.stringify(['Unlimited stores', 'Unlimited products', 'All platforms', 'Bulk operations', 'Priority support']),
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
      description: 'For large operations',
      price: 99.99,
      yearlyPrice: 999.99,
      productLimit: -1, // unlimited
      features: JSON.stringify(['Everything in Professional', 'Advanced analytics', 'API access', 'Dedicated support', 'Custom integrations']),
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
      console.error(`❌ Failed to create ${planData.name}:`, error.message)
    }
  }
  
  console.log('\n✅ Pricing plans setup complete!')
  
  // Verify
  const count = await prisma.pricingPlan.count()
  console.log(`\n📊 Total pricing plans: ${count}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())