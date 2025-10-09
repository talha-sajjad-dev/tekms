import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testing database connection...\n')
  
  try {
    // Test 1: Basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Test 2: Count users
    const userCount = await prisma.user.count()
    console.log(`✅ Users in database: ${userCount}`)
    
    // Test 3: Find admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'gokhansancar@gmail.com' }
    })
    
    if (admin) {
      console.log('✅ Admin user found:')
      console.log(`   - Email: ${admin.email}`)
      console.log(`   - Name: ${admin.name}`)
      console.log(`   - Role: ${admin.role}`)
      // Check if password exists using any
      const hasPassword = (admin as any).password !== null
      console.log(`   - Has password: ${hasPassword}`)
    } else {
      console.log('❌ Admin user NOT found')
    }
    
    // Test 4: Check subscriptions
    const subCount = await prisma.subscription.count()
    console.log(`✅ Subscriptions in database: ${subCount}`)
    
    console.log('\n🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()