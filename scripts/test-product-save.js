require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Direct Product Save\n')
  
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
  console.log(`   User ID: ${store.userId}\n`)
  
  // Try to create a test product
  console.log('🔨 Attempting to save a test product...\n')
  
  try {
    const testProduct = await prisma.product.create({
      data: {
        userId: store.userId,
        platform: 'BIGCOMMERCE',
        externalId: 'TEST_' + Date.now(),
        storeConnectionId: store.id,
        importMethod: 'oauth',
        name: 'Test Product - ' + new Date().toISOString(),
        description: 'This is a test product to verify database writes',
        sku: 'TEST-SKU-' + Date.now(),
        price: 9.99,
        categories: [],
        tags: ['test']
      }
    })
    
    console.log('✅ SUCCESS! Product created:')
    console.log(`   Database ID: ${testProduct.id}`)
    console.log(`   Name: ${testProduct.name}`)
    console.log(`   External ID: ${testProduct.externalId}`)
    console.log(`   Created At: ${testProduct.createdAt}`)
    
    // Verify it's in database
    const count = await prisma.product.count({
      where: {
        storeConnectionId: store.id
      }
    })
    
    console.log(`\n📊 Total products in database for this store: ${count}`)
    
    // Clean up
    console.log('\n🧹 Cleaning up test product...')
    await prisma.product.delete({
      where: { id: testProduct.id }
    })
    console.log('✅ Test product deleted')
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ DATABASE WRITE TEST PASSED!')
    console.log('The database connection and schema are working correctly.')
    console.log('The sync issue must be in the sync logic itself.')
    
  } catch (error) {
    console.error('\n❌ FAILED TO SAVE PRODUCT!')
    console.error('This is the root cause of the sync issue!\n')
    console.error('Error details:')
    console.error(error)
    
    if (error.code === 'P2002') {
      console.error('\n🔍 UNIQUE CONSTRAINT VIOLATION')
      console.error('A product with these values already exists:')
      console.error(`   Fields: ${error.meta?.target?.join(', ')}`)
      console.error('\nSolution: Check for duplicate products with same:')
      console.error('   - userId + platform + externalId + importMethod')
    } else if (error.code === 'P2003') {
      console.error('\n🔍 FOREIGN KEY CONSTRAINT VIOLATION')
      console.error('Referenced record does not exist')
    } else if (error.message.includes('required')) {
      console.error('\n🔍 MISSING REQUIRED FIELD')
      console.error('Check if all required fields are provided')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())