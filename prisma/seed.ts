import { PrismaClient, SubscriptionTier } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting TEKMS Listing Manager database seed...')

  // 1. Create admin user with legacy permissions
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'gokhansancar@gmail.com'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '123456789Gs_'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // Grant admin legacy feature access
      allowLegacyEtsyImport: true,
      allowLegacyTikTokExport: true,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
      // Grant admin legacy feature access
      allowLegacyEtsyImport: true,
      allowLegacyTikTokExport: true,
    },
  })
  
  console.log('✅ Admin user created:', admin.email)
  console.log('✅ Admin granted legacy feature permissions')

  // 2. Create PAID subscription for admin (unlimited stores)
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: { tier: 'PAID' },
    create: {
      userId: admin.id,
      tier: 'PAID',
      status: 'ACTIVE',
    },
  })
  
  console.log('✅ Admin subscription created (PAID tier)')

  // 3. Create per-store pricing tiers
  const storePricingTiers = [
    {
      name: 'Starter',
      minProducts: 10,
      maxProducts: 100,
      monthlyPrice: 10.00,
      yearlyPrice: 100.00,
      features: ['All platforms', 'Basic support', 'Email notifications'],
      isActive: true,
      displayOrder: 1,
      description: 'Perfect for small catalogs',
    },
    {
      name: 'Growth',
      minProducts: 100,
      maxProducts: 250,
      monthlyPrice: 15.00,
      yearlyPrice: 150.00,
      features: ['All platforms', 'Priority support', 'Advanced analytics'],
      isActive: true,
      displayOrder: 2,
      description: 'Great for growing businesses',
    },
    {
      name: 'Pro',
      minProducts: 250,
      maxProducts: 500,
      monthlyPrice: 20.00,
      yearlyPrice: 200.00,
      features: ['All platforms', 'Priority support', 'Advanced analytics', 'Bulk operations'],
      isActive: true,
      displayOrder: 3,
      description: 'For established sellers',
    },
    {
      name: 'Advanced',
      minProducts: 500,
      maxProducts: 750,
      monthlyPrice: 25.00,
      yearlyPrice: 250.00,
      features: ['All platforms', 'Priority support', 'Advanced analytics', 'Bulk operations', 'Scheduled syncs'],
      isActive: true,
      displayOrder: 4,
      description: 'High-volume stores',
    },
    {
      name: 'Scale',
      minProducts: 750,
      maxProducts: 1000,
      monthlyPrice: 30.00,
      yearlyPrice: 300.00,
      features: ['All features', 'Priority support', 'API access'],
      isActive: true,
      displayOrder: 5,
      description: 'Large catalogs',
    },
    {
      name: 'Premium',
      minProducts: 1000,
      maxProducts: 1500,
      monthlyPrice: 50.00,
      yearlyPrice: 500.00,
      features: ['All features', 'Dedicated support', 'Custom integrations'],
      isActive: true,
      displayOrder: 6,
      description: 'Extra-large catalogs',
    },
    {
      name: 'Enterprise',
      minProducts: 1500,
      maxProducts: -1, // Unlimited
      monthlyPrice: 0, // Contact us
      yearlyPrice: 0,
      features: ['Custom pricing', 'Dedicated account manager', 'SLA', 'Custom integrations'],
      isActive: true,
      displayOrder: 7,
      description: 'Custom solutions for enterprise',
    },
  ]

  for (const tier of storePricingTiers) {
    const created = await prisma.storePricingTier.create({
      data: tier,
    })
    console.log(`✅ Store pricing tier created: ${tier.name} (${tier.minProducts}-${tier.maxProducts === -1 ? '∞' : tier.maxProducts} products, $${tier.monthlyPrice}/mo)`)
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