import { PrismaClient, SubscriptionTier } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting TEKMS Listing Manager database seed...')

  // 1. Create admin user
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'gokhansancar@gmail.com'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '123456789Gs_'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })
  
  console.log('✅ Admin user created:', admin.email)

  // 2. Create free subscription for admin
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      tier: 'FREE',
      status: 'ACTIVE',
    },
  })
  
  console.log('✅ Admin subscription created')

  // 3. Create pricing plans
  const plans = [
    {
      tier: SubscriptionTier.FREE,
      name: 'Free',
      description: 'Perfect for testing and small projects',
      price: 0,
      yearlyPrice: 0,
      productLimit: 10,
      features: [
        '10 products per month',
        'BigCommerce integration',
        'Shopify integration',
        'Basic support',
        'Email notifications',
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: false,
      allowTikTok: false,
      allowBulkOps: false,
      allowScheduledSync: false,
      allowAdvancedAnalytics: false,
      allowPrioritySupport: false,
      allowAPIAccess: false,
      isActive: true,
      displayOrder: 1,
      isPopular: false,
      badgeText: null,
    },
    {
      tier: SubscriptionTier.STARTER,
      name: 'Starter',
      description: 'Great for growing businesses',
      price: 29.99,
      yearlyPrice: 299.99,
      productLimit: 100,
      features: [
        '100 products per month',
        'BigCommerce integration',
        'Shopify integration',
        'Priority email support',
        'Basic analytics',
        'Bulk operations',
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: false,
      allowTikTok: false,
      allowBulkOps: true,
      allowScheduledSync: false,
      allowAdvancedAnalytics: false,
      allowPrioritySupport: true,
      allowAPIAccess: false,
      isActive: true,
      displayOrder: 2,
      isPopular: true,
      badgeText: 'Most Popular',
    },
    {
      tier: SubscriptionTier.PROFESSIONAL,
      name: 'Professional',
      description: 'For serious marketplace sellers',
      price: 99.99,
      yearlyPrice: 999.99,
      productLimit: 1000,
      features: [
        '1000 products per month',
        'All marketplace integrations',
        'Etsy import',
        'TikTok Shop export',
        'Advanced analytics',
        'Bulk operations',
        'Scheduled syncs',
        'Priority support',
        'API access',
      ],
      allowBigCommerce: true,
      allowShopify: true,
      allowEtsy: true,
      allowTikTok: true,
      allowBulkOps: true,
      allowScheduledSync: true,
      allowAdvancedAnalytics: true,
      allowPrioritySupport: true,
      allowAPIAccess: true,
      isActive: true,
      displayOrder: 3,
      isPopular: false,
      badgeText: null,
    },
  ]

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    })
    console.log(`✅ ${plan.name} plan created/updated`)
  }

  console.log('\n🎉 Database seed completed successfully!')
  console.log('\n📝 Admin Login Credentials:')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log('\n⚠️  Make sure to change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })