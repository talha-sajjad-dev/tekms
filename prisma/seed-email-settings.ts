import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding email SMTP settings...')

  const emailSettings = [
    // SMTP Configuration
    {
      key: 'smtp_host',
      value: 'smtp.zoho.com',
      type: 'string',
      category: 'email',
      description: 'SMTP server hostname',
      isPublic: false
    },
    {
      key: 'smtp_port',
      value: '465',
      type: 'string',
      category: 'email',
      description: 'SMTP port (465 for SSL)',
      isPublic: false
    },
    {
      key: 'smtp_secure',
      value: 'true',
      type: 'string',
      category: 'email',
      description: 'Use SSL/TLS',
      isPublic: false
    },
    {
      key: 'smtp_user',
      value: '',
      type: 'string',
      category: 'email',
      description: 'SMTP username (email address)',
      isPublic: false
    },
    {
      key: 'smtp_password',
      value: '',
      type: 'string',
      category: 'email',
      description: 'SMTP password (app password)',
      isPublic: false
    },
    {
      key: 'email_from_address',
      value: 'noreply@tekms.com',
      type: 'string',
      category: 'email',
      description: 'From email address',
      isPublic: false
    },
    {
      key: 'email_from_name',
      value: 'TEKMS Listing Manager',
      type: 'string',
      category: 'email',
      description: 'From name',
      isPublic: false
    }
  ]

  for (const setting of emailSettings) {
    const existing = await prisma.settings.findUnique({
      where: { key: setting.key }
    })

    if (existing) {
      console.log(`Setting "${setting.key}" already exists, skipping...`)
      continue
    }

    await prisma.settings.create({
      data: setting
    })
    console.log(`✓ Created setting: ${setting.key}`)
  }

  console.log('Email settings seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding email settings:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })