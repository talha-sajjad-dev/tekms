import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const pages = [
  {
    slug: 'about',
    title: 'About TEKMS Listing Manager',
    content: `
      <div class="space-y-6">
        <p class="text-lg">TEKMS Listing Manager is a powerful SaaS platform designed to streamline multi-marketplace operations for e-commerce businesses of all sizes.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
        <p>We empower online sellers to manage their product listings across multiple marketplaces from a single, unified dashboard.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">What We Do</h2>
        <ul class="space-y-2">
          <li>Connect multiple marketplace stores in one place</li>
          <li>Automatic product synchronization across platforms</li>
          <li>Real-time inventory management</li>
          <li>Per-store subscription billing</li>
        </ul>
      </div>
    `,
    metaTitle: 'About Us - TEKMS Listing Manager',
    metaDescription: 'Learn about TEKMS - the all-in-one marketplace management platform',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 1
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    content: `
      <div class="space-y-6">
        <p class="text-lg">Get in touch with our team</p>
        <div class="grid gap-4">
          <div><strong>Email:</strong> support@tekms.com</div>
          <div><strong>Phone:</strong> 1-800-TEKMS-00</div>
          <div><strong>Address:</strong> 123 Market Street, San Francisco, CA 94103</div>
        </div>
      </div>
    `,
    metaTitle: 'Contact Us - TEKMS',
    metaDescription: 'Contact TEKMS support team',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 2
  },
  {
    slug: 'partners',
    title: 'Partners',
    content: `
      <div class="space-y-6">
        <p class="text-lg">TEKMS partners with leading e-commerce platforms</p>
        <h2 class="text-2xl font-semibold">Marketplace Partners</h2>
        <ul>
          <li>Shopify - Official Partner</li>
          <li>BigCommerce - Verified Technology Partner</li>
          <li>Etsy - Certified API Integration</li>
          <li>TikTok Shop - Official Partner</li>
        </ul>
      </div>
    `,
    metaTitle: 'Partners - TEKMS',
    metaDescription: 'Our marketplace and technology partners',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 3
  },
  {
    slug: 'events',
    title: 'Events & Webinars',
    content: `
      <div class="space-y-6">
        <p class="text-lg">Join our upcoming events and webinars</p>
        <p>Stay tuned for upcoming product launches and e-commerce automation summits.</p>
      </div>
    `,
    metaTitle: 'Events - TEKMS',
    metaDescription: 'TEKMS events and webinars',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 4
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    content: `
      <div class="space-y-6">
        <p>This Cookie Policy explains how TEKMS uses cookies and similar technologies.</p>
        <h2 class="text-2xl font-semibold">What are cookies?</h2>
        <p>Cookies are small data files that help us provide you with a better experience.</p>
      </div>
    `,
    metaTitle: 'Cookie Policy - TEKMS',
    metaDescription: 'TEKMS cookie policy and privacy',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 6
  },
  {
    slug: 'gdpr',
    title: 'GDPR Compliance',
    content: `
      <div class="space-y-6">
        <p>TEKMS is committed to GDPR compliance and data protection.</p>
        <h2 class="text-2xl font-semibold">Your Rights</h2>
        <ul>
          <li>Right to Access</li>
          <li>Right to Rectification</li>
          <li>Right to Erasure</li>
          <li>Right to Data Portability</li>
        </ul>
      </div>
    `,
    metaTitle: 'GDPR Compliance - TEKMS',
    metaDescription: 'TEKMS GDPR compliance and data protection',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 7
  },
  {
    slug: 'security',
    title: 'Security & Compliance',
    content: `
      <div class="space-y-6">
        <p class="text-lg">Security is our top priority at TEKMS.</p>
        <h2 class="text-2xl font-semibold">Security Measures</h2>
        <ul>
          <li>AES-256-GCM encryption</li>
          <li>SOC 2 Type II certified</li>
          <li>GDPR compliant</li>
          <li>24/7 monitoring</li>
        </ul>
      </div>
    `,
    metaTitle: 'Security - TEKMS',
    metaDescription: 'TEKMS security and compliance certifications',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 8
  },
  {
    slug: 'support',
    title: 'Customer Support',
    content: `
      <div class="space-y-6">
        <p class="text-lg">How can we help you?</p>
        <h2 class="text-2xl font-semibold">Support Options</h2>
        <ul>
          <li>Email: support@tekms.com</li>
          <li>Phone: 1-800-TEKMS-00</li>
          <li>Live Chat: Available Mon-Fri 9am-6pm PST</li>
        </ul>
      </div>
    `,
    metaTitle: 'Support - TEKMS',
    metaDescription: 'TEKMS customer support and help',
    isPublished: true,
    isFooterLink: true,
    displayOrder: 9
  }
]

async function main() {
  console.log('Seeding pages...')
  
  for (const pageData of pages) {
    const page = await prisma.page.upsert({
      where: { slug: pageData.slug },
      update: pageData,
      create: pageData
    })
    console.log(`✓ ${page.title} (/${page.slug})`)
  }
  
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })