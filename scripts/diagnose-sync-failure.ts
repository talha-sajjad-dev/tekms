import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Diagnosing BigCommerce Sync Failure\n')
  console.log('=' .repeat(60))
  
  // 1. Check store connections
  console.log('\n1️⃣  STORE CONNECTIONS')
  console.log('-'.repeat(60))
  const stores = await prisma.storeConnection.findMany({
    where: { platform: 'BIGCOMMERCE' },
    include: {
      user: { select: { email: true, name: true } }
    }
  })
  
  console.log(`Found ${stores.length} BigCommerce store(s):\n`)
  for (const store of stores) {
    console.log(`Store: ${store.storeName}`)
    console.log(`  ID: ${store.id}`)
    console.log(`  User: ${store.user.email}`)
    console.log(`  Store Hash: ${store.externalStoreId}`)
    console.log(`  Active: ${store.isActive}`)
    console.log(`  Product Count: ${store.productCount}`)
    console.log(`  Sync Status: ${store.syncStatus}`)
    console.log(`  Last Synced: ${store.lastSyncedAt || 'Never'}`)
    console.log(`  Sync Error: ${store.syncError || 'None'}`)
    console.log(`  Created: ${store.createdAt}`)
    console.log(`  Token Expires: ${store.tokenExpiresAt || 'N/A'}`)
    console.log()
  }
  
  // 2. Check products for these stores
  console.log('\n2️⃣  PRODUCTS IN DATABASE')
  console.log('-'.repeat(60))
  for (const store of stores) {
    const products = await prisma.product.findMany({
      where: {
        platform: 'BIGCOMMERCE',
        storeConnectionId: store.id
      },
      take: 5
    })
    
    console.log(`Store "${store.storeName}" has ${products.length} products`)
    if (products.length > 0) {
      products.forEach(p => {
        console.log(`  - ${p.name} (ID: ${p.externalId})`)
      })
    }
    console.log()
  }
  
  // 3. Check recent sync jobs
  console.log('\n3️⃣  RECENT SYNC JOBS')
  console.log('-'.repeat(60))
  const syncJobs = await prisma.syncJob.findMany({
    where: { platform: 'BIGCOMMERCE' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: { select: { email: true } }
    }
  })
  
  console.log(`Found ${syncJobs.length} recent sync job(s):\n`)
  for (const job of syncJobs) {
    console.log(`Job ID: ${job.id}`)
    console.log(`  User: ${job.user.email}`)
    console.log(`  Status: ${job.status}`)
    console.log(`  Action: ${job.action}`)
    console.log(`  Total Items: ${job.totalItems}`)
    console.log(`  Processed: ${job.processedItems}`)
    console.log(`  Failed: ${job.failedItems}`)
    console.log(`  Started: ${job.startedAt}`)
    console.log(`  Completed: ${job.completedAt}`)
    if (job.errorLog) {
      console.log(`  Error: ${job.errorLog.substring(0, 200)}...`)
    }
    console.log()
  }
  
  // 4. Check for orphaned products
  console.log('\n4️⃣  ORPHANED PRODUCTS')
  console.log('-'.repeat(60))
  const orphaned = await prisma.product.findMany({
    where: {
      platform: 'BIGCOMMERCE',
      storeConnectionId: null
    }
  })
  console.log(`Found ${orphaned.length} orphaned BigCommerce products\n`)
  
  // 5. Check for duplicate constraints
  console.log('\n5️⃣  DUPLICATE PRODUCT CHECK')
  console.log('-'.repeat(60))
  const duplicates = await prisma.$queryRaw<Array<{
    userId: string
    platform: string
    externalId: string
    importMethod: string
    count: bigint
  }>>`
    SELECT "userId", platform, "externalId", "importMethod", COUNT(*) as count
    FROM "Product"
    WHERE platform = 'BIGCOMMERCE'
    GROUP BY "userId", platform, "externalId", "importMethod"
    HAVING COUNT(*) > 1
  `
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate product entries!`)
    duplicates.forEach(dup => {
      console.log(`  - External ID ${dup.externalId}: ${dup.count} copies`)
    })
  } else {
    console.log('✅ No duplicate products found')
  }
  
  // 6. Database schema check
  console.log('\n\n6️⃣  DATABASE SCHEMA VALIDATION')
  console.log('-'.repeat(60))
  
  try {
    // Try to create a test product
    const testStore = stores[0]
    if (testStore) {
      console.log('Testing product creation with store:', testStore.storeName)
      
      const testProduct = await prisma.product.create({
        data: {
          userId: testStore.userId,
          platform: 'BIGCOMMERCE',
          externalId: 'TEST_' + Date.now(),
          storeConnectionId: testStore.id,
          importMethod: 'oauth',
          name: 'Test Product',
          description: 'Test description',
          sku: 'TEST-SKU',
          price: 9.99,
          categories: [],
          tags: []
        }
      })
      
      console.log('✅ Test product created successfully:', testProduct.id)
      
      // Clean up test product
      await prisma.product.delete({ where: { id: testProduct.id } })
      console.log('✅ Test product deleted successfully')
    } else {
      console.log('⚠️  No stores found to test with')
    }
  } catch (error) {
    console.error('❌ Failed to create test product:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Diagnosis complete!\n')
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  console.log('-'.repeat(60))
  
  if (stores.length === 0) {
    console.log('❌ No BigCommerce stores connected!')
    console.log('   → User needs to connect a store first')
  } else {
    const activeStores = stores.filter(s => s.isActive)
    if (activeStores.length === 0) {
      console.log('⚠️  All stores are inactive')
      console.log('   → Check why stores are marked inactive')
    }
    
    const storesWithErrors = stores.filter(s => s.syncError)
    if (storesWithErrors.length > 0) {
      console.log(`⚠️  ${storesWithErrors.length} store(s) have sync errors`)
      console.log('   → Review error messages above')
    }
    
    const storesWithProducts = stores.filter(s => s.productCount > 0)
    if (storesWithProducts.length === 0) {
      console.log('⚠️  No stores have products synced')
      console.log('   → Products are being fetched but not saved')
      console.log('   → Check sync logs and database constraints')
    }
  }
  
  if (orphaned.length > 0) {
    console.log(`⚠️  ${orphaned.length} orphaned products found`)
    console.log('   → Run: npx ts-node scripts/fix-sync-issue.ts')
  }
  
  if (duplicates.length > 0) {
    console.log(`❌ ${duplicates.length} duplicate products found`)
    console.log('   → This will cause unique constraint violations')
    console.log('   → Run: npx ts-node scripts/fix-sync-issue.ts')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())