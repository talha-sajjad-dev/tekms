import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.syncJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('\n🔍 Recent Sync Jobs:\n')
  
  for (const job of jobs) {
    console.log(`Job ID: ${job.id}`)
    console.log(`Platform: ${job.platform}`)
    console.log(`Status: ${job.status}`)
    console.log(`Total Items: ${job.totalItems}`)
    console.log(`Processed: ${job.processedItems}`)
    console.log(`Failed: ${job.failedItems}`)
    console.log(`Started: ${job.startedAt}`)
    console.log(`Completed: ${job.completedAt}`)
    
    if (job.errorLog) {
      console.log(`\n❌ ERROR LOG:\n${job.errorLog}\n`)
    }
    
    if (job.results) {
      console.log(`\nResults: ${JSON.stringify(job.results, null, 2)}\n`)
    }
    
    console.log('---\n')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())