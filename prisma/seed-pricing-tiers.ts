import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding pricing tiers...')

  // Default per-store pricing tiers based on product count
  const tiers = [
    {
      name: 'Free',
      minProducts: 0,
      maxProducts: 10,
      monthlyPrice: '0.00',
      yearlyPrice: null,
      features: [
        '1 store connection',
        'Up to 10 products',
        'Basic sync',
        'Email support'
      ],
      description: 'Perfect for testing and small stores',
      displayOrder: 0,
      isActive: true
    },
    {
      name: 'Starter',
      minProducts: 11,
      maxProducts: 100,
      monthlyPrice: '10.00',
      yearlyPrice: '100.00',
      features: [
        'Up to 100 products per store',
        'Multi-platform sync',
        'Priority sync',
        'Email support',
        'Basic analytics'
      ],
      description: 'Great for growing businesses',
      displayOrder: 1,
      isActive: true
    },
    {
      name: 'Growth',
      minProducts: 101,
      maxProducts: 500,
      monthlyPrice: '25.00',
      yearlyPrice: '250.00',
      features: [
        'Up to 500 products per store',
        'Advanced sync options',
        'Bulk operations',
        'Priority support',
        'Advanced analytics',
        'Custom fields'
      ],
      description: 'Scale your product listings',
      displayOrder: 2,
      isActive: true
    },
    {
      name: 'Business',
      minProducts: 501,
      maxProducts: 2000,
      monthlyPrice: '50.00',
      yearlyPrice: '500.00',
      features: [
        'Up to 2,000 products per store',
        'Real-time sync',
        'Advanced bulk operations',
        'Priority support',
        'Advanced analytics',
        'API access',
        'Custom integrations'
      ],
      description: 'For established businesses',
      displayOrder: 3,
      isActive: true
    },
    {
      name: 'Professional',
      minProducts: 2001,
      maxProducts: 10000,
      monthlyPrice: '100.00',
      yearlyPrice: '1000.00',
      features: [
        'Up to 10,000 products per store',
        'Real-time sync',
        'Advanced automation',
        'Dedicated support',
        'Advanced analytics & reporting',
        'Full API access',
        'Custom integrations',
        'Webhook support'
      ],
      description: 'Enterprise-grade features',
      displayOrder: 4,
      isActive: true
    },
    {
      name: 'Advanced',
      minProducts: 10001,
      maxProducts: -1, // Unlimited
      monthlyPrice: '200.00',
      yearlyPrice: '2000.00',
      features: [
        'Unlimited products per store',
        'Real-time sync',
        'Advanced automation',
        'Dedicated account manager',
        'Custom analytics & reporting',
        'Full API access',
        'Custom integrations',
        'Webhook support',
        'White-label options'
      ],
      description: 'Maximum scale and performance',
      displayOrder: 5,
      isActive: true
    }
  ]

  for (const tier of tiers) {
    const existing = await prisma.storePricingTier.findFirst({
      where: { name: tier.name }
    })

    if (existing) {
      console.log(`Tier "${tier.name}" already exists, skipping...`)
      continue
    }

    await prisma.storePricingTier.create({
      data: tier
    })
    console.log(`✓ Created pricing tier: ${tier.name}`)
  }

  console.log('Pricing tiers seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding pricing tiers:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })