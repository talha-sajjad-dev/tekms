import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing settings visibility...')

  // Mark logo and icon settings as public so they're available to frontend
  const keysToMakePublic = [
    'website.logo_url',
    'website.favicon_url',
    'platform.bigcommerce_icon',
    'platform.shopify_icon',
    'platform.etsy_icon',
    'platform.tiktok_icon'
  ]

  for (const key of keysToMakePublic) {
    await prisma.settings.updateMany({
      where: { key },
      data: { isPublic: true }
    })
    console.log(`✓ Made public: ${key}`)
  }

  console.log('✅ Settings visibility fixed!')
  console.log('\nNow restart your dev server and test:')
  console.log('1. Visit /admin/settings/website')
  console.log('2. Change logo URL or upload a file')
  console.log('3. Save settings')
  console.log('4. Refresh homepage - should see your logo!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })