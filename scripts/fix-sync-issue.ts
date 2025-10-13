import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Diagnosing sync issue...\n')
  
  // Check for orphaned products that might block new syncs
  const orphanedProducts = await prisma.product.findMany({
    where: {
      storeConnectionId: null,
      platform: 'BIGCOMMERCE'
    }
  })
  
  console.log(`Found ${orphanedProducts.length} orphaned BigCommerce products`)
  
  if (orphanedProducts.length > 0) {
    console.log('These products have no store connection and may cause conflicts\n')
    
    // Delete orphaned products
    const deleted = await prisma.product.deleteMany({
      where: {
        storeConnectionId: null,
        platform: 'BIGCOMMERCE'
      }
    })
    
    console.log(`✅ Deleted ${deleted.count} orphaned products\n`)
  }
  
  // Check for duplicate externalIds that might conflict
  const duplicates = await prisma.product.groupBy({
    by: ['userId', 'platform', 'externalId', 'importMethod'],
    _count: true,
    having: {
      userId: {
        _count: {
          gt: 1
        }
      }
    }
  })
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate product entries`)
    console.log('These will cause unique constraint violations\n')
    
    // Keep the newest, delete the rest
    for (const dup of duplicates) {
      const products = await prisma.product.findMany({
        where: {
          userId: dup.userId,
          platform: dup.platform,
          externalId: dup.externalId,
          importMethod: dup.importMethod
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Delete all except the first (newest)
      if (products.length > 1) {
        for (let i = 1; i < products.length; i++) {
          await prisma.product.delete({
            where: { id: products[i].id }
          })
        }
        console.log(`✅ Removed ${products.length - 1} duplicate(s) of ${dup.externalId}`)
      }
    }
  }
  
  console.log('\n✅ Database cleaned!')
  console.log('Now try syncing again - should work properly\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())