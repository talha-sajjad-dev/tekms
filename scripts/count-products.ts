import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.product.count()
  console.log(`\nTotal products in database: ${total}\n`)
  
  if (total > 0) {
    // Group by user
    const byUser = await prisma.product.groupBy({
      by: ['userId'],
      _count: true
    })
    
    for (const group of byUser) {
      const user = await prisma.user.findUnique({
        where: { id: group.userId },
        select: { email: true }
      })
      console.log(`${user?.email}: ${group._count} products`)
    }
    
    // Show BigCommerce products specifically
    const bcProducts = await prisma.product.findMany({
      where: { platform: 'BIGCOMMERCE' },
      take: 5,
      select: {
        name: true,
        storeConnectionId: true,
        userId: true,
        createdAt: true
      }
    })
    
    console.log(`\nSample BigCommerce Products:`)
    bcProducts.forEach(p => {
      console.log(`  - ${p.name}`)
      console.log(`    StoreID: ${p.storeConnectionId || 'NULL'}`)
      console.log(`    Created: ${p.createdAt}`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())