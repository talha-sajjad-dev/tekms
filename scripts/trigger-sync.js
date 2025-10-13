require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Triggering Product Sync...\n')
  
  // Get the store
  const store = await prisma.storeConnection.findFirst({
    where: { 
      platform: 'BIGCOMMERCE',
      isActive: true
    }
  })
  
  if (!store) {
    console.error('❌ No store found!')
    return
  }
  
  console.log(`✅ Found store: ${store.storeName}`)
  console.log(`   Store ID: ${store.id}`)
  console.log(`   Current product count: ${store.productCount}\n`)
  
  // Call the sync API endpoint
  console.log('📡 Calling sync API endpoint...\n')
  
  try {
    const response = await fetch(`http://localhost:3000/api/stores/${store.id}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't have authentication, but let's see what happens
      },
      body: JSON.stringify({ background: false })
    })
    
    console.log(`Response Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    console.log('\nResponse Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ Sync request successful!')
      console.log(`   Products synced: ${data.productCount || 0}`)
      
      // Check database
      const updatedStore = await prisma.storeConnection.findUnique({
        where: { id: store.id }
      })
      
      console.log(`\n📊 Database Check:`)
      console.log(`   Store product count: ${updatedStore.productCount}`)
      console.log(`   Last synced: ${updatedStore.lastSyncedAt}`)
      console.log(`   Sync status: ${updatedStore.syncStatus}`)
      
      const dbProducts = await prisma.product.count({
        where: { storeConnectionId: store.id }
      })
      
      console.log(`   Actual products in DB: ${dbProducts}`)
      
      if (dbProducts === 0 && (data.productCount || 0) > 0) {
        console.log('\n⚠️  SYNC COMPLETED BUT NO PRODUCTS SAVED!')
        console.log('This confirms the silent failure issue.')
      }
      
    } else {
      console.error('\n❌ Sync request failed!')
      console.error(`   Error: ${data.error || 'Unknown error'}`)
      
      if (response.status === 401) {
        console.log('\n🔐 Authentication required')
        console.log('   This script needs to be run from authenticated context')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to call sync API:')
    console.error(error.message)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())