require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Checking Recent Sync Job Logs\n')
  console.log('=' .repeat(60))
  
  const jobs = await prisma.syncJob.findMany({
    where: {
      platform: 'BIGCOMMERCE'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: {
        select: { email: true }
      }
    }
  })
  
  if (jobs.length === 0) {
    console.log('No sync jobs found')
    return
  }
  
  console.log(`\nFound ${jobs.length} recent sync job(s):\n`)
  
  jobs.forEach((job, i) => {
    console.log(`\n${i + 1}. Job ID: ${job.id}`)
    console.log(`   User: ${job.user.email}`)
    console.log(`   Platform: ${job.platform}`)
    console.log(`   Action: ${job.action}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Total Items: ${job.totalItems}`)
    console.log(`   Processed: ${job.processedItems}`)
    console.log(`   Failed: ${job.failedItems}`)
    console.log(`   Created: ${job.createdAt}`)
    console.log(`   Started: ${job.startedAt}`)
    console.log(`   Completed: ${job.completedAt}`)
    
    if (job.errorLog) {
      console.log(`   Error Log:`)
      console.log(`   ${job.errorLog}`)
    }
    
    if (job.results) {
      console.log(`   Results:`)
      console.log(`   ${JSON.stringify(job.results, null, 2)}`)
    }
    
    console.log(`   ${'─'.repeat(58)}`)
  })
  
  // Check products for the most recent sync
  const latestJob = jobs[0]
  console.log(`\n\n📊 Checking products after latest sync...`)
  
  const products = await prisma.product.findMany({
    where: {
      userId: latestJob.userId,
      platform: 'BIGCOMMERCE',
      createdAt: {
        gte: latestJob.startedAt || latestJob.createdAt
      }
    },
    take: 5
  })
  
  console.log(`   Products created during/after this sync: ${products.length}`)
  
  if (products.length > 0) {
    console.log(`\n   Sample products:`)
    products.forEach(p => {
      console.log(`   - ${p.name} (External ID: ${p.externalId})`)
    })
  } else {
    console.log(`   ⚠️  No products were saved during this sync!`)
  }
  
  // Get store info
  const store = await prisma.storeConnection.findFirst({
    where: {
      userId: latestJob.userId,
      platform: 'BIGCOMMERCE'
    }
  })
  
  if (store) {
    console.log(`\n📦 Store Info:`)
    console.log(`   Name: ${store.storeName}`)
    console.log(`   Product Count (cached): ${store.productCount}`)
    console.log(`   Last Synced: ${store.lastSyncedAt}`)
    console.log(`   Sync Status: ${store.syncStatus}`)
    console.log(`   Sync Error: ${store.syncError || 'None'}`)
    
    const actualCount = await prisma.product.count({
      where: {
        storeConnectionId: store.id,
        platform: 'BIGCOMMERCE'
      }
    })
    
    console.log(`   Actual products in DB: ${actualCount}`)
    
    if (latestJob.status === 'completed' && actualCount === 0) {
      console.log(`\n❌ CRITICAL ISSUE CONFIRMED:`)
      console.log(`   - Sync job marked as "completed"`)
      console.log(`   - Processed ${latestJob.processedItems} items`)
      console.log(`   - But 0 products in database`)
      console.log(`   - This means products are fetched but not saved`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())