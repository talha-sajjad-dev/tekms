import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing all settings...\n')

  // 1. Make all branding/frontend settings public
  console.log('Making settings public...')
  await prisma.settings.updateMany({
    where: {
      key: {
        in: [
          'website.logo_url',
          'website.favicon_url',
          'website.name',
          'website.header_title',
          'website.tagline',
          'footer.copyright_text',
          'footer.show_social',
          'footer.social_twitter',
          'footer.social_facebook',
          'footer.social_linkedin',
          'footer.social_instagram',
          'platform.bigcommerce_icon',
          'platform.shopify_icon',
          'platform.etsy_icon',
          'platform.tiktok_icon',
          'seo.meta_description',
          'seo.meta_keywords',
          'seo.og_image_url',
          'general.google_analytics_id'
        ]
      }
    },
    data: { isPublic: true }
  })
  console.log('✓ All frontend settings now public\n')

  // 2. Ensure copyright text has a value
  const copyright = await prisma.settings.findUnique({
    where: { key: 'footer.copyright_text' }
  })
  
  if (!copyright || !copyright.value) {
    await prisma.settings.upsert({
      where: { key: 'footer.copyright_text' },
      update: {
        value: `© ${new Date().getFullYear()} TEKMS Listing Manager. All rights reserved.`,
        isPublic: true
      },
      create: {
        key: 'footer.copyright_text',
        value: `© ${new Date().getFullYear()} TEKMS Listing Manager. All rights reserved.`,
        category: 'footer',
        type: 'string',
        isPublic: true,
        description: 'Footer copyright text'
      }
    })
    console.log('✓ Created footer copyright text\n')
  }

  console.log('✅ All settings fixed!')
  console.log('\n📝 Summary:')
  console.log('- Logo/favicon/icons are now public')
  console.log('- Copyright text has default value')
  console.log('- All settings accessible via API')
  console.log('\n🚀 Next: Restart dev server to see changes!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })