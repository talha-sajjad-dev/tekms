require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Decrypt function
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getKey(salt) {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error("ENCRYPTION_KEY not set")
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
  console.log('🔄 Manual Sync Test - Simulating actual sync process\n')
  
  const store = await prisma.storeConnection.findFirst({
    where: { platform: 'BIGCOMMERCE', isActive: true }
  })
  
  if (!store) {
    console.error('❌ No store found!')
    return
  }
  
  console.log(`Store: ${store.storeName}`)
  console.log(`Store Hash: ${store.externalStoreId}`)
  console.log(`User ID: ${store.userId}\n`)
  
  try {
    // Decrypt token
    const accessToken = decrypt(store.accessToken)
    console.log('✅ Token decrypted\n')
    
    // Fetch first 5 products from BigCommerce
    console.log('📡 Fetching products from BigCommerce API...')
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${store.externalStoreId}/v3/catalog/products?limit=5&page=1`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const products = data.data || []
    
    console.log(`✅ Fetched ${products.length} products\n`)
    
    if (products.length === 0) {
      console.log('⚠️  No products returned from API')
      return
    }
    
    // Try to save first product
    console.log('💾 Attempting to save first product...\n')
    const bcProduct = products[0]
    
    console.log(`Product Details:`)
    console.log(`  ID: ${bcProduct.id}`)
    console.log(`  Name: ${bcProduct.name}`)
    console.log(`  Price: ${bcProduct.price}`)
    console.log(`  SKU: ${bcProduct.sku || 'N/A'}`)
    console.log()
    
    try {
      // Check if exists
      const existing = await prisma.product.findFirst({
        where: {
          userId: store.userId,
          platform: 'BIGCOMMERCE',
          externalId: bcProduct.id.toString(),
          storeConnectionId: store.id
        }
      })
      
      console.log(`Existing product check: ${existing ? 'FOUND (will update)' : 'NOT FOUND (will create)'}`)
      
      const productData = {
        userId: store.userId,
        platform: 'BIGCOMMERCE',
        externalId: bcProduct.id.toString(),
        storeConnectionId: store.id,
        importMethod: 'oauth',
        name: bcProduct.name,
        description: bcProduct.description || null,
        sku: bcProduct.sku || null,
        price: bcProduct.price || 0,
        compareAtPrice: bcProduct.retail_price || null,
        categories: (bcProduct.categories || []).map(c => c.toString()),
        tags: [],
        images: bcProduct.images ? { images: bcProduct.images } : undefined,
        variants: bcProduct.variants ? { variants: bcProduct.variants } : undefined,
        customFields: bcProduct.custom_fields ? { custom_fields: bcProduct.custom_fields } : undefined,
        platformData: bcProduct,
        lastSyncedAt: new Date(),
        syncStatus: 'synced'
      }
      
      console.log('\nAttempting database operation...')
      
      let savedProduct
      if (existing) {
        savedProduct = await prisma.product.update({
          where: { id: existing.id },
          data: productData
        })
        console.log(`✅ Product UPDATED: ${savedProduct.id}`)
      } else {
        savedProduct = await prisma.product.create({
          data: productData
        })
        console.log(`✅ Product CREATED: ${savedProduct.id}`)
      }
      
      // Verify it's in database
      const verify = await prisma.product.findUnique({
        where: { id: savedProduct.id }
      })
      
      if (verify) {
        console.log(`✅ VERIFIED: Product exists in database`)
        console.log(`   DB ID: ${verify.id}`)
        console.log(`   Name: ${verify.name}`)
        console.log(`   External ID: ${verify.externalId}`)
      } else {
        console.log(`❌ VERIFICATION FAILED: Product not found after save!`)
      }
      
      console.log('\n' + '='.repeat(60))
      console.log('✅ MANUAL SYNC TEST PASSED!')
      console.log('Product can be saved successfully.')
      console.log('The issue must be in the sync route logic or caching.')
      
    } catch (dbError) {
      console.error('\n❌ DATABASE ERROR!')
      console.error('This is why products are not saving!\n')
      console.error(dbError)
      
      if (dbError.code) {
        console.error(`\nPrisma Error Code: ${dbError.code}`)
      }
      if (dbError.meta) {
        console.error(`Error Meta:`, dbError.meta)
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:')
    console.error(error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())