import { PrismaClient } from '@prisma/client'
import { decrypt } from '../lib/encryption'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.log('Usage: npx tsx scripts/test-sync.ts customer@email.com')
    process.exit(1)
  }
  
  console.log(`\n🔍 Diagnosing sync for: ${email}\n`)
  
  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      subscription: true,
      storeConnections: {
        include: {
          storeSubscription: {
            include: {
              pricingTier: true
            }
          }
        }
      }
    }
  })
  
  if (!user) {
    console.log('❌ User not found')
    process.exit(1)
  }
  
  console.log(`✅ User: ${user.name || user.email}`)
  console.log(`   Subscription: ${user.subscription?.tier || 'NONE'}`)
  console.log(`   Status: ${user.subscription?.status || 'N/A'}\n`)
  
  // 2. Check stores
  console.log(`📦 Connected Stores: ${user.storeConnections.length}`)
  for (const store of user.storeConnections) {
    console.log(`\n   Store: ${store.storeName}`)
    console.log(`   Platform: ${store.platform}`)
    console.log(`   Is Active: ${store.isActive}`)
    console.log(`   Sync Status: ${store.syncStatus || 'not synced'}`)
    console.log(`   Products: ${store.productCount}`)
    console.log(`   Last Synced: ${store.lastSyncedAt || 'Never'}`)
    
    if (store.syncError) {
      console.log(`   ❌ Sync Error: ${store.syncError}`)
    }
    
    // Test token
    try {
      const token = decrypt(store.accessToken)
      const testUrl = `https://api.bigcommerce.com/stores/${store.externalStoreId}/v2/store`
      const res = await fetch(testUrl, {
        headers: {
          'X-Auth-Token': token,
          'Accept': 'application/json'
        }
      })
      
      if (res.ok) {
        console.log(`   ✅ Token Valid - API accessible`)
        
        // Try to fetch products
        const productsRes = await fetch(
          `https://api.bigcommerce.com/stores/${store.externalStoreId}/v3/catalog/products?limit=5`,
          {
            headers: {
              'X-Auth-Token': token,
              'Accept': 'application/json'
            }
          }
        )
        
        if (productsRes.ok) {
          const data = await productsRes.json()
          console.log(`   ✅ Can fetch products - Store has ${data.meta?.pagination?.total || 0} products`)
        } else {
          console.log(`   ❌ Cannot fetch products: ${productsRes.status} ${productsRes.statusText}`)
        }
      } else {
        console.log(`   ❌ Token Invalid: ${res.status} ${res.statusText}`)
      }
    } catch (error) {
      console.log(`   ❌ Token Test Failed: ${error}`)
    }
  }
  
  // 3. Check recent sync jobs
  const syncJobs = await prisma.syncJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.log(`\n📋 Recent Sync Jobs: ${syncJobs.length}`)
  for (const job of syncJobs) {
    console.log(`\n   Job: ${job.id}`)
    console.log(`   Platform: ${job.platform}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Created: ${job.createdAt}`)
    if (job.errorLog) {
      console.log(`   Error: ${job.errorLog.substring(0, 200)}...`)
    }
  }
  
  // 4. Check subscription limits
  if (user.subscription) {
    const plan = await prisma.pricingPlan.findUnique({
      where: { tier: user.subscription.tier }
    })
    
    if (plan) {
      console.log(`\n💰 Plan Limits:`)
      console.log(`   Products: ${plan.productLimit === -1 ? 'Unlimited' : plan.productLimit}`)
      console.log(`   BigCommerce: ${plan.allowBigCommerce ? '✅' : '❌'}`)
      console.log(`   Shopify: ${plan.allowShopify ? '✅' : '❌'}`)
      console.log(`   Etsy: ${plan.allowEtsy ? '✅' : '❌'}`)
      console.log(`   TikTok: ${plan.allowTikTok ? '✅' : '❌'}`)
    }
  }
  
  console.log('\n✅ Diagnosis complete!\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())