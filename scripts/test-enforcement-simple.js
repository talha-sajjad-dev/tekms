require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Inline copy of getUserSubscriptionLimits logic
async function testSubscriptionCheck(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  })

  if (!user?.subscription) {
    return null
  }

  // Map subscription tier to platform access
  const tierConfig = {
    FREE: {
      productLimit: 10,
      allowBigCommerce: true,
      allowShopify: false,
      allowEtsy: false,
      allowTikTok: false,
      allowBulkOps: false,
      allowScheduledSync: false,
      allowAdvancedAnalytics: false,
      allowAPIAccess: false,
    },
    PAID: {
      productLimit: -1,
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: false,
      allowAPIAccess: false,
    },
    ENTERPRISE: {
      productLimit: -1,
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: true,
      allowAPIAccess: true,
    },
  }

  const config = tierConfig[user.subscription.tier]

  return {
    tier: user.subscription.tier,
    ...config,
  }
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'gokhansancar@gmail.com' }
  })
  
  if (!user) {
    console.log('❌ User not found')
    return
  }
  
  console.log('🧪 Testing Subscription Enforcement\n')
  console.log(`👤 User: ${user.email} (${user.role})`)
  
  const limits = await testSubscriptionCheck(user.id)
  
  if (!limits) {
    console.log('\n❌ FAILED: No subscription limits returned')
    console.log('   This would cause 403 errors!')
  } else {
    console.log('\n✅ SUCCESS: Subscription limits returned!')
    console.log('   Tier:', limits.tier)
    console.log('   Product Limit:', limits.productLimit === -1 ? '∞' : limits.productLimit)
    console.log('   BigCommerce:', limits.allowBigCommerce ? '✅' : '❌')
    console.log('   Shopify:', limits.allowShopify ? '✅' : '❌')
    console.log('   Etsy:', limits.allowEtsy ? '✅' : '❌')
    console.log('   TikTok:', limits.allowTikTok ? '✅' : '❌')
    console.log('   Bulk Ops:', limits.allowBulkOps ? '✅' : '❌')
    console.log('   Scheduled Sync:', limits.allowScheduledSync ? '✅' : '❌')
    
    if (limits.allowBigCommerce) {
      console.log('\n🎉 BigCommerce sync will be ALLOWED!')
      console.log('   The 403 error should be fixed.')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())