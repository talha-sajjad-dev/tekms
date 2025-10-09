import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const email = 'gokhansancar@gmail.com'
  const password = '123456789Gs_'
  const name = 'Gokhan Sancar'

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      console.log('❌ User already exists. Updating to ADMIN role...')
      
      const updated = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      })
      
      console.log('✅ User updated to ADMIN role')
      console.log('📧 Email:', updated.email)
      console.log('👤 Role:', updated.role)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin user
    const user = await (prisma.user.create as any)({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date()
      }
    })

    // Create subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'ENTERPRISE',
        status: 'ACTIVE'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('👤 Role: ADMIN')
    console.log('💎 Tier: ENTERPRISE (unlimited)')
    console.log('')
    console.log('🎉 You can now sign in at http://localhost:3000')
    
  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()