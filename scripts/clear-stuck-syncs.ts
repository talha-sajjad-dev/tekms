/**
 * Clear stuck sync jobs from database
 * Run with: npx ts-node scripts/clear-stuck-syncs.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearStuckSyncs() {
  try {
    console.log('🔍 Checking for stuck sync jobs...\n')
    
    // Find all processing jobs
    const stuckJobs = await prisma.syncJob.findMany({
      where: {
        status: 'processing'
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (stuckJobs.length === 0) {
      console.log('✅ No stuck sync jobs found!')
      return
    }
    
    console.log(`Found ${stuckJobs.length} stuck sync job(s):\n`)
    
    stuckJobs.forEach((job, index) => {
      const runningTime = job.startedAt 
        ? Math.round((Date.now() - job.startedAt.getTime()) / 1000 / 60)
        : 0
      
      console.log(`${index + 1}. Job ID: ${job.id}`)
      console.log(`   Platform: ${job.platform}`)
      console.log(`   User: ${job.user.email}`)
      console.log(`   Started: ${job.startedAt?.toLocaleString() || 'Unknown'}`)
      console.log(`   Running: ${runningTime} minutes`)
      console.log(`   Progress: ${job.processedItems}/${job.totalItems}`)
      console.log(`   Status: ${job.status}`)
      console.log('')
    })
    
    // Clear them
    console.log('🧹 Clearing stuck jobs...')
    
    const result = await prisma.syncJob.updateMany({
      where: {
        status: 'processing'
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorLog: 'Manually cancelled - stuck job cleared by admin script'
      }
    })
    
    console.log(`✅ Cleared ${result.count} stuck sync job(s)!`)
    console.log('\nYou can now start new syncs.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearStuckSyncs()