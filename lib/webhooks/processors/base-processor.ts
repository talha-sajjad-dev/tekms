import { db } from '@/lib/db'
import { Platform } from '@prisma/client'

/**
 * Base Webhook Event Processor
 * Abstract class that all specific event processors extend
 */

export interface ProcessingResult {
  success: boolean
  error?: string
  changes?: {
    entity: string
    entityId: string
    field: string
    oldValue: any
    newValue: any
  }[]
}

export abstract class BaseWebhookProcessor {
  protected platform: Platform
  protected eventType: string

  constructor(platform: Platform, eventType: string) {
    this.platform = platform
    this.eventType = eventType
  }

  /**
   * Process a webhook event
   * This is the main entry point called by the webhook processing system
   */
  async processEvent(eventId: string): Promise<ProcessingResult> {
    try {
      // Fetch the webhook event from database
      const event = await db.webhookEvent.findUnique({
        where: { id: eventId },
        include: {
          storeConnection: true
        }
      })

      if (!event) {
        throw new Error(`Webhook event not found: ${eventId}`)
      }

      if (event.processed) {
        return {
          success: true,
          error: 'Event already processed'
        }
      }

      // Validate platform and event type match
      if (event.platform !== this.platform || event.eventType !== this.eventType) {
        throw new Error(
          `Processor mismatch: expected ${this.platform}/${this.eventType}, got ${event.platform}/${event.eventType}`
        )
      }

      console.log(`Processing webhook event ${eventId}: ${this.platform}/${this.eventType}`)

      // Call the specific processor implementation
      const result = await this.process(event.payload, event.storeConnection!)

      // Update the webhook event record
      await db.webhookEvent.update({
        where: { id: eventId },
        data: {
          processed: true,
          processedAt: new Date(),
          processingError: result.error
        }
      })

      // Log changes if any
      if (result.changes && result.changes.length > 0) {
        await this.logChanges(
          event.storeConnection!.userId,
          result.changes,
          eventId
        )
      }

      return result

    } catch (error) {
      console.error(`Error processing webhook event ${eventId}:`, error)

      // Increment retry count
      await db.webhookEvent.update({
        where: { id: eventId },
        data: {
          retryCount: {
            increment: 1
          },
          processingError: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Abstract method that specific processors must implement
   * This contains the actual processing logic for the event
   */
  protected abstract process(
    payload: any,
    storeConnection: any
  ): Promise<ProcessingResult>

  /**
   * Log changes to the ChangeLog table
   */
  protected async logChanges(
    userId: string,
    changes: ProcessingResult['changes'],
    sourceId: string
  ): Promise<void> {
    if (!changes || changes.length === 0) return

    try {
      await db.changeLog.createMany({
        data: changes.map(change => ({
          userId,
          entityType: change.entity,
          entityId: change.entityId,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          source: 'webhook',
          sourceId,
          platform: this.platform
        }))
      })

      console.log(`Logged ${changes.length} changes for webhook event ${sourceId}`)
    } catch (error) {
      console.error('Error logging changes:', error)
      // Don't throw - logging failures shouldn't fail the whole processing
    }
  }

  /**
   * Helper to find or create a MasterProduct from external product ID
   */
  protected async findOrCreateMasterProduct(
    userId: string,
    externalId: string,
    productData: {
      title: string
      description?: string
      sku?: string
      price: number
      images?: string[]
    }
  ): Promise<string> {
    // Try to find existing channel listing
    const channelListing = await db.channelListing.findFirst({
      where: {
        externalId,
        platform: this.platform,
        userId
      },
      include: {
        masterProduct: true
      }
    })

    if (channelListing?.masterProduct) {
      return channelListing.masterProductId
    }

    // Create new master product
    const masterProduct = await db.masterProduct.create({
      data: {
        userId,
        title: productData.title,
        description: productData.description,
        baseSKU: productData.sku || `SKU-${Date.now()}`,
        basePrice: productData.price,
        images: productData.images || [],
        status: 'PUBLISHED'
      }
    })

    return masterProduct.id
  }
}

/**
 * Processor Registry
 * Maps event types to their respective processors
 */
export class ProcessorRegistry {
  private static processors: Map<string, BaseWebhookProcessor> = new Map()

  static register(platform: Platform, eventType: string, processor: BaseWebhookProcessor) {
    const key = `${platform}:${eventType}`
    this.processors.set(key, processor)
  }

  static get(platform: Platform, eventType: string): BaseWebhookProcessor | undefined {
    const key = `${platform}:${eventType}`
    return this.processors.get(key)
  }

  static async processEvent(eventId: string): Promise<ProcessingResult> {
    // Fetch event to determine processor
    const event = await db.webhookEvent.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      throw new Error(`Webhook event not found: ${eventId}`)
    }

    const processor = this.get(event.platform, event.eventType)
    
    if (!processor) {
      throw new Error(`No processor registered for ${event.platform}:${event.eventType}`)
    }

    return processor.processEvent(eventId)
  }
}