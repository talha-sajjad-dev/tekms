require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Subscription Status\n')
  console.log('=' .repeat(60))
  
  // Get your user
  const user = await prisma.user.findUnique({
    where: { email: 'gokhansancar@gmail.com' },
    include: {
      subscription: true,
      storeConnections: true
    }
  })
  
  if (!user) {
    console.error('❌ User not found!')
    return
  }
  
  console.log('\n👤 User Info:')
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   ID: ${user.id}`)
  
  console.log('\n💳 Subscription Status:')
  if (!user.subscription) {
    console.error('   ❌ NO SUBSCRIPTION FOUND!')
    console.log('\n   This is why sync fails with 403!')
    console.log('   You need to create a subscription record.')
    
    console.log('\n🔧 Creating Enterprise subscription now...')
    try {
      const created = await prisma.subscription.create({
        data: {
          userId: user.id,
          tier: 'ENTERPRISE',
          status: 'ACTIVE',
          isGifted: true,
          giftedBy: user.id,
          giftDuration: 12, // 12 months
          giftStartedAt: new Date(),
          giftExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          giftNote: 'Auto-created for testing'
        }
      })
      
      console.log('   ✅ Subscription created!')
      console.log(`   Tier: ${created.tier}`)
      console.log(`   Status: ${created.status}`)
      console.log(`   Expires: ${created.giftExpiresAt}`)
      
    } catch (error) {
      console.error('   ❌ Failed to create subscription:', error.message)
    }
  } else {
    console.log(`   ✅ Subscription EXISTS`)
    console.log(`   Tier: ${user.subscription.tier}`)
    console.log(`   Status: ${user.subscription.status}`)
    console.log(`   Stripe ID: ${user.subscription.stripeSubscriptionId || 'N/A'}`)
    console.log(`   Is Gifted: ${user.subscription.isGifted}`)
    if (user.subscription.isGifted) {
      console.log(`   Gifted By: ${user.subscription.giftedBy}`)
      console.log(`   Duration: ${user.subscription.giftDuration} months`)
      console.log(`   Started: ${user.subscription.giftStartedAt}`)
      console.log(`   Expires: ${user.subscription.giftExpiresAt}`)
    }
  }
  
  console.log('\n🏪 Store Connections:')
  console.log(`   Total: ${user.storeConnections.length}`)
  user.storeConnections.forEach((store, i) => {
    console.log(`\n   ${i + 1}. ${store.storeName}`)
    console.log(`      Platform: ${store.platform}`)
    console.log(`      Active: ${store.isActive}`)
    console.log(`      Products: ${store.productCount}`)
  })
  
  // Check pricing plans
  console.log('\n\n📋 Available Pricing Plans:')
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  })
  
  plans.forEach(plan => {
    console.log(`\n   ${plan.name} (${plan.tier})`)
    console.log(`   - Product Limit: ${plan.productLimit === -1 ? 'Unlimited' : plan.productLimit}`)
    console.log(`   - BigCommerce: ${plan.allowBigCommerce}`)
    console.log(`   - Shopify: ${plan.allowShopify}`)
    console.log(`   - Etsy: ${plan.allowEtsy}`)
    console.log(`   - TikTok: ${plan.allowTikTok}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Check Complete!\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())