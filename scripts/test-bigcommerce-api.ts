import { PrismaClient } from '@prisma/client'
import { decrypt } from '@/lib/encryption'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing BigCommerce API Connection\n')
  console.log('=' .repeat(60))
  
  // Get the most recent BigCommerce store
  const store = await prisma.storeConnection.findFirst({
    where: { 
      platform: 'BIGCOMMERCE',
      isActive: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  if (!store) {
    console.error('❌ No active BigCommerce stores found!')
    return
  }
  
  console.log('\n✅ Found Store:')
  console.log(`   Name: ${store.storeName}`)
  console.log(`   Store Hash: ${store.externalStoreId}`)
  console.log(`   Active: ${store.isActive}`)
  console.log(`   Last Sync: ${store.lastSyncedAt || 'Never'}`)
  
  try {
    // Decrypt the access token
    console.log('\n🔐 Decrypting access token...')
    const accessToken = decrypt(store.accessToken)
    console.log(`   Token length: ${accessToken.length} chars`)
    console.log(`   Token prefix: ${accessToken.substring(0, 10)}...`)
    
    // Test API call - fetch products
    console.log('\n📡 Making API request to BigCommerce...')
    const url = `https://api.bigcommerce.com/stores/${store.externalStoreId}/v3/catalog/products?limit=10&page=1`
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': accessToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`)
    console.log(`   Headers:`)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('limit')) {
        console.log(`   - ${key}: ${value}`)
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ API Error Response:')
      console.error(errorText)
      
      // Check for common errors
      if (response.status === 401) {
        console.error('\n🔑 Authentication Error!')
        console.error('   - Access token may be invalid or expired')
        console.error('   - Check BigCommerce API credentials')
        console.error('   - User may need to reconnect store')
      } else if (response.status === 403) {
        console.error('\n🚫 Permission Error!')
        console.error('   - API account may not have required scopes')
        console.error('   - Check scopes in BigCommerce API account')
      } else if (response.status === 404) {
        console.error('\n❓ Not Found Error!')
        console.error('   - Store hash may be incorrect')
        console.error('   - Check externalStoreId matches your store')
      } else if (response.status === 429) {
        console.error('\n⏱️  Rate Limit Exceeded!')
        console.error('   - Too many requests to BigCommerce API')
        console.error('   - Wait and try again')
      }
      
      return
    }
    
    const data = await response.json()
    
    console.log('\n✅ API Request Successful!')
    console.log(`\n📊 Response Data:`)
    console.log(`   Products returned: ${data.data?.length || 0}`)
    console.log(`   Total products: ${data.meta?.pagination?.total || 'unknown'}`)
    console.log(`   Current page: ${data.meta?.pagination?.current_page || 1}`)
    console.log(`   Total pages: ${data.meta?.pagination?.total_pages || 'unknown'}`)
    
    if (data.data && data.data.length > 0) {
      console.log(`\n📦 Sample Products:`)
      data.data.slice(0, 3).forEach((product: any, index: number) => {
        console.log(`\n   ${index + 1}. ${product.name}`)
        console.log(`      ID: ${product.id}`)
        console.log(`      SKU: ${product.sku || 'N/A'}`)
        console.log(`      Price: $${product.price || 0}`)
        console.log(`      Categories: ${product.categories?.length || 0}`)
      })
    }
    
    // Test database write
    console.log('\n\n💾 Testing Database Write...')
    const testProduct = data.data?.[0]
    if (testProduct) {
      try {
        const created = await prisma.product.create({
          data: {
            userId: store.userId,
            platform: 'BIGCOMMERCE',
            externalId: 'TEST_' + testProduct.id,
            storeConnectionId: store.id,
            importMethod: 'oauth',
            name: testProduct.name + ' [TEST]',
            description: testProduct.description || null,
            sku: testProduct.sku || null,
            price: testProduct.price || 0,
            categories: [],
            tags: []
          }
        })
        
        console.log('✅ Test product created successfully!')
        console.log(`   Database ID: ${created.id}`)
        
        // Clean up
        await prisma.product.delete({ where: { id: created.id } })
        console.log('✅ Test product deleted')
        
      } catch (dbError) {
        console.error('❌ Database Write Failed!')
        console.error(dbError)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ BigCommerce API Test Complete!\n')
    
  } catch (error) {
    console.error('\n❌ Test Failed!')
    console.error(error)
    
    if (error instanceof Error) {
      if (error.message.includes('decrypt')) {
        console.error('\n🔐 Decryption Error!')
        console.error('   - Access token encryption may be corrupted')
        console.error('   - User may need to reconnect store')
      } else if (error.message.includes('fetch')) {
        console.error('\n🌐 Network Error!')
        console.error('   - Check internet connection')
        console.error('   - BigCommerce API may be down')
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())