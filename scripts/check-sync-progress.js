/**
 * Check current sync progress
 * Run with: node scripts/check-sync-progress.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkProgress() {
  try {
    console.log('🔍 Checking sync progress...\n')
    
    // Get recent sync jobs
    const recentJobs = await prisma.syncJob.findMany({
      where: {
        platform: 'BIGCOMMERCE',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    
    if (recentJobs.length === 0) {
      console.log('❌ No recent BigCommerce sync jobs found (last 30 minutes)')
      await prisma.$disconnect()
      return
    }
    
    console.log(`Found ${recentJobs.length} recent BigCommerce sync job(s):\n`)
    
    for (const job of recentJobs) {
      const runningTime = job.startedAt 
        ? Math.round((Date.now() - job.startedAt.getTime()) / 1000 / 60)
        : 0
      
      console.log(`📊 Job ID: ${job.id}`)
      console.log(`   User: ${job.user.email}`)
      console.log(`   Status: ${job.status}`)
      console.log(`   Started: ${job.startedAt?.toLocaleString() || 'Not started'}`)
      console.log(`   Running: ${runningTime} minutes`)
      console.log(`   Progress: ${job.processedItems}/${job.totalItems}`)
      console.log(`   Action: ${job.action}`)
      
      if (job.errorLog) {
        console.log(`   ❌ Error: ${job.errorLog.substring(0, 200)}`)
      }
      
      console.log('')
    }
    
    // Check if any are truly stuck
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const stuckJobs = recentJobs.filter(job => 
      job.status === 'processing' && 
      job.startedAt &&
      job.startedAt < thirtyMinutesAgo
    )
    
    if (stuckJobs.length > 0) {
      console.log(`⚠️  ${stuckJobs.length} job(s) appear to be stuck (running >30 min)`)
      console.log('   Run: node scripts/clear-stuck-syncs.js to clear them\n')
    }
    
    // Count recent products synced
    const recentProducts = await prisma.product.count({
      where: {
        platform: 'BIGCOMMERCE',
        lastSyncedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    })
    
    console.log(`📦 Products synced in last 10 minutes: ${recentProducts}`)
    
    if (recentProducts > 0 && recentJobs[0]?.status === 'processing') {
      console.log('✅ Sync IS working! Products are being saved to database.')
      console.log('   The progress bar just is not updating properly.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProgress()