import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding website settings...')

  const settings = [
    // Branding
    {
      key: 'website.name',
      value: 'TEKMS Listing Manager',
      type: 'string',
      category: 'branding',
      description: 'Website name',
      isPublic: true
    },
    {
      key: 'website.header_title',
      value: 'Multi-Platform Product Manager',
      type: 'string',
      category: 'branding',
      description: 'Header title shown in navigation',
      isPublic: true
    },
    {
      key: 'website.tagline',
      value: 'Manage products across multiple platforms',
      type: 'string',
      category: 'branding',
      description: 'Site tagline or slogan',
      isPublic: true
    },
    {
      key: 'website.logo_url',
      value: '/placeholder-logo.svg',
      type: 'string',
      category: 'branding',
      description: 'Website logo URL',
      isPublic: true
    },
    {
      key: 'website.favicon_url',
      value: '/favicon.ico',
      type: 'string',
      category: 'branding',
      description: 'Favicon URL',
      isPublic: true
    },

    // Platform Icons
    {
      key: 'platform.bigcommerce_icon',
      value: '',
      type: 'string',
      category: 'platform_icons',
      description: 'BigCommerce custom icon SVG',
      isPublic: false
    },
    {
      key: 'platform.shopify_icon',
      value: '',
      type: 'string',
      category: 'platform_icons',
      description: 'Shopify custom icon SVG',
      isPublic: false
    },
    {
      key: 'platform.etsy_icon',
      value: '',
      type: 'string',
      category: 'platform_icons',
      description: 'Etsy custom icon SVG',
      isPublic: false
    },
    {
      key: 'platform.tiktok_icon',
      value: '',
      type: 'string',
      category: 'platform_icons',
      description: 'TikTok custom icon SVG',
      isPublic: false
    },

    // Pages
    {
      key: 'page.homepage_hero',
      value: 'Welcome to TEKMS Listing Manager',
      type: 'string',
      category: 'pages',
      description: 'Homepage hero title',
      isPublic: true
    },
    {
      key: 'page.homepage_description',
      value: 'Manage your products across BigCommerce, Shopify, Etsy, and TikTok Shop from one powerful dashboard',
      type: 'string',
      category: 'pages',
      description: 'Homepage hero description',
      isPublic: true
    },
    {
      key: 'page.about_content',
      value: 'TEKMS Listing Manager helps businesses manage their products across multiple e-commerce platforms efficiently.',
      type: 'string',
      category: 'pages',
      description: 'About page content',
      isPublic: true
    },
    {
      key: 'page.contact_info',
      value: 'Email: support@tekms.com\nResponse time: 24-48 hours',
      type: 'string',
      category: 'pages',
      description: 'Contact information',
      isPublic: true
    },

    // Footer
    {
      key: 'footer.copyright_text',
      value: `© ${new Date().getFullYear()} TEKMS Listing Manager. All rights reserved.`,
      type: 'string',
      category: 'footer',
      description: 'Footer copyright text',
      isPublic: true
    },
    {
      key: 'footer.show_social',
      value: 'true',
      type: 'boolean',
      category: 'footer',
      description: 'Show social media links in footer',
      isPublic: true
    },
    {
      key: 'footer.social_twitter',
      value: '',
      type: 'string',
      category: 'footer',
      description: 'Twitter/X profile URL',
      isPublic: true
    },
    {
      key: 'footer.social_facebook',
      value: '',
      type: 'string',
      category: 'footer',
      description: 'Facebook page URL',
      isPublic: true
    },
    {
      key: 'footer.social_linkedin',
      value: '',
      type: 'string',
      category: 'footer',
      description: 'LinkedIn profile URL',
      isPublic: true
    },
    {
      key: 'footer.social_instagram',
      value: '',
      type: 'string',
      category: 'footer',
      description: 'Instagram profile URL',
      isPublic: true
    },

    // SEO
    {
      key: 'seo.meta_description',
      value: 'Manage your products across multiple e-commerce platforms from one dashboard. Support for BigCommerce, Shopify, Etsy, and TikTok Shop.',
      type: 'string',
      category: 'seo',
      description: 'Site meta description',
      isPublic: true
    },
    {
      key: 'seo.meta_keywords',
      value: 'product management, e-commerce, multi-platform, BigCommerce, Shopify, Etsy, TikTok Shop',
      type: 'string',
      category: 'seo',
      description: 'Site meta keywords',
      isPublic: true
    },
    {
      key: 'seo.og_image_url',
      value: '/og-image.png',
      type: 'string',
      category: 'seo',
      description: 'Open Graph image for social sharing',
      isPublic: true
    },

    // General
    {
      key: 'general.maintenance_mode',
      value: 'false',
      type: 'boolean',
      category: 'general',
      description: 'Enable maintenance mode',
      isPublic: false
    },
    {
      key: 'general.google_analytics_id',
      value: '',
      type: 'string',
      category: 'general',
      description: 'Google Analytics tracking ID',
      isPublic: true
    },
    {
      key: 'general.custom_css',
      value: '',
      type: 'string',
      category: 'general',
      description: 'Custom CSS to inject into all pages',
      isPublic: false
    }
  ]

  for (const setting of settings) {
    const existing = await prisma.settings.findUnique({
      where: { key: setting.key }
    })

    if (!existing) {
      await prisma.settings.create({
        data: setting
      })
      console.log(`✓ Created: ${setting.key}`)
    } else {
      console.log(`  Skipped: ${setting.key} (already exists)`)
    }
  }

  console.log('✅ Website settings seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding settings:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })