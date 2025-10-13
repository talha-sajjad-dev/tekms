/**
 * Background Job Queue System
 * Handles processing of bulk operations asynchronously
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export type JobType = 'bulk_operation' | 'sync_products' | 'ai_operation'

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

interface JobProcessor {
  (jobId: string, data: any): Promise<void>
}

class JobQueue {
  private processors: Map<string, JobProcessor> = new Map()
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  /**
   * Register a job processor for a specific job type
   */
  registerProcessor(type: string, processor: JobProcessor) {
    this.processors.set(type, processor)
  }

  /**
   * Start processing jobs from the queue
   */
  start(intervalMs: number = 5000) {
    if (this.processingInterval) return

    console.log('🚀 Job queue started')
    this.processingInterval = setInterval(() => {
      this.processNextJob()
    }, intervalMs)

    // Process one immediately
    this.processNextJob()
  }

  /**
   * Stop processing jobs
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('⏸️ Job queue stopped')
    }
  }

  /**
   * Process the next queued job
   */
  private async processNextJob() {
    if (this.isProcessing) return

    try {
      this.isProcessing = true

      // Find next queued bulk operation
      const job = await db.bulkOperation.findFirst({
        where: {
          status: 'queued'
        },
        orderBy: {
          createdAt: 'asc' // FIFO
        }
      })

      if (!job) {
        this.isProcessing = false
        return
      }

      console.log(`📋 Processing job ${job.id} (${job.type})`)

      // Update status to processing
      await db.bulkOperation.update({
        where: { id: job.id },
        data: {
          status: 'processing',
          startedAt: new Date()
        }
      })

      // Get processor for this job type
      const processor = this.processors.get(job.type)
      
      if (!processor) {
        throw new Error(`No processor registered for job type: ${job.type}`)
      }

      // Execute processor
      await processor(job.id, {
        userId: job.userId,
        productIds: job.productIds,
        changes: job.changes,
        filters: job.filters
      })

      console.log(`✅ Job ${job.id} completed successfully`)

    } catch (error) {
      console.error('❌ Job processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Queue a new job (creates BulkOperation record)
   */
  async queueJob(data: {
    userId: string
    type: string
    productIds: string[]
    changes?: any
    filters?: any
  }) {
    const job = await db.bulkOperation.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: 'queued',
        totalItems: data.productIds.length,
        productIds: data.productIds,
        changes: data.changes || {},
        filters: data.filters || {}
      }
    })

    console.log(`➕ Job ${job.id} queued (${data.productIds.length} items)`)
    return job.id
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    return await db.bulkOperation.findUnique({
      where: { id: jobId }
    })
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string) {
    await db.bulkOperation.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    })
  }
}

// Export singleton instance
export const jobQueue = new JobQueue()

// Register bulk operation processors
jobQueue.registerProcessor('delete', async (jobId, data) => {
  const job = await db.bulkOperation.findUnique({ where: { id: jobId } })
  if (!job) return

  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < data.productIds.length; i++) {
    try {
      await db.product.delete({
        where: {
          id: data.productIds[i],
          userId: data.userId
        }
      })
      successCount++
    } catch (error) {
      failedCount++
      console.error(`Failed to delete product ${data.productIds[i]}:`, error)
    }

    // Update progress every 10 items
    if (i % 10 === 0) {
      await db.bulkOperation.update({
        where: { id: jobId },
        data: {
          processedItems: i + 1,
          progress: Math.floor(((i + 1) / data.productIds.length) * 100)
        }
      })
    }
  }

  // Mark as completed
  await db.bulkOperation.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processedItems: data.productIds.length,
      successItems: successCount,
      failedItems: failedCount,
      progress: 100,
      completedAt: new Date()
    }
  })
})

jobQueue.registerProcessor('update_price', async (jobId, data) => {
  const job = await db.bulkOperation.findUnique({ where: { id: jobId } })
  if (!job) return

  let successCount = 0
  let failedCount = 0
  const changes = data.changes

  for (let i = 0; i < data.productIds.length; i++) {
    try {
      const product = await db.product.findUnique({
        where: { id: data.productIds[i] },
        select: { price: true }
      })
      
      if (!product) {
        failedCount++
        continue
      }
      
      let newPrice = Number(product.price)
      const value = Number(changes.value)
      
      if (changes.action === 'increase') {
        if (changes.unit === 'percent') {
          newPrice = newPrice * (1 + value / 100)
        } else {
          newPrice = newPrice + value
        }
      } else if (changes.action === 'decrease') {
        if (changes.unit === 'percent') {
          newPrice = newPrice * (1 - value / 100)
        } else {
          newPrice = newPrice - value
        }
      } else if (changes.action === 'set') {
        newPrice = value
      }
      
      newPrice = Math.max(0, newPrice)
      
      await db.product.update({
        where: { id: data.productIds[i] },
        data: { price: newPrice }
      })
      
      successCount++
    } catch (error) {
      failedCount++
      console.error(`Failed to update price for product ${data.productIds[i]}:`, error)
    }

    // Update progress
    if (i % 10 === 0) {
      await db.bulkOperation.update({
        where: { id: jobId },
        data: {
          processedItems: i + 1,
          progress: Math.floor(((i + 1) / data.productIds.length) * 100)
        }
      })
    }
  }

  await db.bulkOperation.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processedItems: data.productIds.length,
      successItems: successCount,
      failedItems: failedCount,
      progress: 100,
      completedAt: new Date()
    }
  })
})

jobQueue.registerProcessor('update_tags', async (jobId, data) => {
  const job = await db.bulkOperation.findUnique({ where: { id: jobId } })
  if (!job) return

  let successCount = 0
  let failedCount = 0
  const changes = data.changes

  for (let i = 0; i < data.productIds.length; i++) {
    try {
      const product = await db.product.findUnique({
        where: { id: data.productIds[i] },
        select: { tags: true }
      })
      
      if (!product) {
        failedCount++
        continue
      }
      
      let newTags = [...product.tags]
      
      if (changes.action === 'add') {
        newTags = [...new Set([...newTags, ...changes.tags])]
      } else if (changes.action === 'remove') {
        newTags = newTags.filter((tag: string) => !changes.tags.includes(tag))
      } else if (changes.action === 'replace') {
        newTags = changes.tags
      }
      
      await db.product.update({
        where: { id: data.productIds[i] },
        data: { tags: newTags }
      })
      
      successCount++
    } catch (error) {
      failedCount++
      console.error(`Failed to update tags for product ${data.productIds[i]}:`, error)
    }

    if (i % 10 === 0) {
      await db.bulkOperation.update({
        where: { id: jobId },
        data: {
          processedItems: i + 1,
          progress: Math.floor(((i + 1) / data.productIds.length) * 100)
        }
      })
    }
  }

  await db.bulkOperation.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processedItems: data.productIds.length,
      successItems: successCount,
      failedItems: failedCount,
      progress: 100,
      completedAt: new Date()
    }
  })
})

// Auto-start the queue in production
if (process.env.NODE_ENV === 'production') {
  jobQueue.start()
}