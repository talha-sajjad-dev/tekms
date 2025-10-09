import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testPassword() {
  const email = 'gokhansancar@gmail.com'
  const testPassword = '123456789Gs_'
  
  console.log('🔍 Testing password verification...\n')
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    const storedPassword = (user as any).password
    
    if (!storedPassword) {
      console.log('❌ No password stored')
      return
    }
    
    console.log('📧 Email:', email)
    console.log('🔑 Testing password:', testPassword)
    console.log('🔒 Stored hash exists:', !!storedPassword)
    
    const isValid = await bcrypt.compare(testPassword, storedPassword)
    
    if (isValid) {
      console.log('\n✅ PASSWORD MATCHES! Login should work.')
    } else {
      console.log('\n❌ PASSWORD DOES NOT MATCH')
      console.log('   Resetting password now...')
      
      const newHash = await bcrypt.hash(testPassword, 10)
      await (prisma.user.update as any)({
        where: { email },
        data: { password: newHash }
      })
      
      console.log('✅ Password reset successfully!')
      console.log('   Try logging in again with:', testPassword)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPassword()