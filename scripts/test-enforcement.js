require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { getUserSubscriptionLimits, canPerformAction } = require('../lib/subscription/enforcement')

const prisma = new PrismaClient()

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
  
  // Test getUserSubscriptionLimits
  console.log('\n📋 Testing getUserSubscriptionLimits()...')
  const limits = await getUserSubscriptionLimits(user.id)
  
  if (!limits) {
    console.log('❌ No limits returned')
  } else {
    console.log('✅ Limits returned:')
    console.log('   Tier:', limits.tier)
    console.log('   Product Limit:', limits.productLimit === -1 ? '∞' : limits.productLimit)
    console.log('   BigCommerce:', limits.allowBigCommerce ? '✓' : '✗')
    console.log('   Shopify:', limits.allowShopify ? '✓' : '✗')
    console.log('   Etsy:', limits.allowEtsy ? '✓' : '✗')
    console.log('   TikTok:', limits.allowTikTok ? '✓' : '✗')
    console.log('   Bulk Ops:', limits.allowBulkOps ? '✓' : '✗')
    console.log('   Scheduled Sync:', limits.allowScheduledSync ? '✓' : '✗')
  }
  
  // Test canPerformAction for BigCommerce
  console.log('\n🔒 Testing canPerformAction(add_product, BIGCOMMERCE)...')
  const result = await canPerformAction(user.id, {
    type: 'add_product',
    platform: 'BIGCOMMERCE',
    productCount: 1
  })
  
  if (result.allowed) {
    console.log('✅ Action ALLOWED')
  } else {
    console.log('❌ Action DENIED')
    console.log('   Reason:', result.reason)
  }
  
  console.log('\n✅ Test complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())