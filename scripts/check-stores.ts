import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking all store connections...\n')
  
  const stores = await prisma.storeConnection.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  console.log(`Found ${stores.length} recent connections:\n`)
  
  for (const store of stores) {
    console.log(`📦 ${store.storeName} (${store.platform})`)
    console.log(`   User: ${store.user.email}`)
    console.log(`   Products: ${store.productCount}`)
    console.log(`   Active: ${store.isActive}`)
    console.log(`   Sync Status: ${store.syncStatus || 'not synced'}`)
    console.log(`   Last Synced: ${store.lastSyncedAt || 'Never'}`)
    if (store.syncError) {
      console.log(`   ❌ Error: ${store.syncError}`)
    }
    console.log('')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())