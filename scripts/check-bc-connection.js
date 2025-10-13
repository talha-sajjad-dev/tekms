require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Decrypt function (matches lib/encryption.ts)
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getKey(salt) {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha512")
}

function decrypt(encryptedText) {
  const buffer = Buffer.from(encryptedText, "base64")

  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION)
  const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = buffer.subarray(ENCRYPTED_POSITION)

  const key = getKey(salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted).toString() + decipher.final("utf8")
}

async function main() {
  console.log('🔍 Checking BigCommerce Connection\n')
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
    console.log('\nPlease connect a BigCommerce store first.')
    return
  }
  
  console.log('\n✅ Found Store:')
  console.log(`   Name: ${store.storeName}`)
  console.log(`   Store Hash: ${store.externalStoreId}`)
  console.log(`   Active: ${store.isActive}`)
  console.log(`   Product Count: ${store.productCount}`)
  console.log(`   Sync Status: ${store.syncStatus || 'N/A'}`)
  console.log(`   Last Sync: ${store.lastSyncedAt || 'Never'}`)
  console.log(`   Sync Error: ${store.syncError || 'None'}`)
  
  try {
    // Decrypt the access token
    console.log('\n🔐 Decrypting access token...')
    const accessToken = decrypt(store.accessToken)
    console.log(`   ✅ Token decrypted successfully (${accessToken.length} chars)`)
    
    // Test API call
    console.log('\n📡 Testing BigCommerce API...')
    const url = `https://api.bigcommerce.com/stores/${store.externalStoreId}/v3/catalog/products?limit=5&page=1`
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': accessToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`   Response: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ API Request Failed!')
      console.error(`   Status: ${response.status}`)
      console.error(`   Error: ${errorText}`)
      
      if (response.status === 401) {
        console.error('\n🔑 AUTHENTICATION ERROR!')
        console.error('   The access token is invalid or expired.')
        console.error('   Solution: User needs to reconnect the store.')
      } else if (response.status === 404) {
        console.error('\n❓ STORE NOT FOUND!')
        console.error(`   Store hash "${store.externalStoreId}" may be incorrect.`)
      }
      return
    }
    
    const data = await response.json()
    const totalProducts = data.meta?.pagination?.total || 0
    const returnedProducts = data.data?.length || 0
    
    console.log(`   ✅ API Request Successful!`)
    console.log(`\n📊 BigCommerce Store Data:`)
    console.log(`   Total Products in BigCommerce: ${totalProducts}`)
    console.log(`   Products in Database: ${store.productCount}`)
    console.log(`   Returned in this request: ${returnedProducts}`)
    
    if (returnedProducts > 0) {
      console.log(`\n📦 Sample Products:`)
      data.data.slice(0, 3).forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.name} (ID: ${product.id})`)
      })
    }
    
    // Check if products exist in database
    const dbProducts = await prisma.product.count({
      where: {
        platform: 'BIGCOMMERCE',
        storeConnectionId: store.id
      }
    })
    
    console.log(`\n💾 Database Check:`)
    console.log(`   Products in DB for this store: ${dbProducts}`)
    
    if (totalProducts > 0 && dbProducts === 0) {
      console.log('\n⚠️  SYNC ISSUE DETECTED!')
      console.log('   BigCommerce has products but database is empty.')
      console.log('   The sync is fetching products but not saving them.')
      console.log('\n   Possible causes:')
      console.log('   1. Database constraint violation')
      console.log('   2. Missing required fields')
      console.log('   3. Errors being silently caught')
      console.log('\n   Solution: Check server logs during next sync attempt.')
    }
    
    // Check recent sync jobs
    const recentJobs = await prisma.syncJob.findMany({
      where: {
        platform: 'BIGCOMMERCE',
        userId: store.userId
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    
    if (recentJobs.length > 0) {
      console.log(`\n📋 Recent Sync Jobs:`)
      recentJobs.forEach((job, i) => {
        console.log(`\n   Job ${i + 1}:`)
        console.log(`   - Status: ${job.status}`)
        console.log(`   - Processed: ${job.processedItems} items`)
        console.log(`   - Failed: ${job.failedItems} items`)
        console.log(`   - Created: ${job.createdAt}`)
        if (job.errorLog) {
          console.log(`   - Error: ${job.errorLog.substring(0, 100)}...`)
        }
      })
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Diagnostic Complete!\n')
    
  } catch (error) {
    console.error('\n❌ Error during diagnostic:')
    console.error(error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())