import { db } from '@/lib/db'
import { Platform } from '@prisma/client'

/**
 * Conflict Resolution System
 * Detects and resolves conflicts between platform data and master data
 */

export type ConflictType = 'PRICE' | 'TITLE' | 'DESCRIPTION' | 'INVENTORY' | 'STATUS'
export type ResolutionPolicy = 'PLATFORM_WINS' | 'MASTER_WINS' | 'MANUAL'

export interface ConflictData {
  type: ConflictType
  field: string
  masterValue: any
  platformValue: any
  channelListingId: string
  platform: Platform
}

export interface ConflictResolution {
  conflictId: string
  resolution: ResolutionPolicy
  resolvedValue?: any
  resolvedBy?: string
}

/**
 * Detect conflicts between master product and channel listing
 */
export async function detectConflicts(
  channelListingId: string
): Promise<ConflictData[]> {
  const conflicts: ConflictData[] = []

  const channelListing = await db.channelListing.findUnique({
    where: { id: channelListingId },
    include: {
      masterProduct: true
    }
  })

  if (!channelListing || !channelListing.masterProduct) {
    return conflicts
  }

  const master = channelListing.masterProduct

  // Check title conflict
  if (
    channelListing.titleOverride &&
    channelListing.titleOverride !== master.title
  ) {
    conflicts.push({
      type: 'TITLE',
      field: 'title',
      masterValue: master.title,
      platformValue: channelListing.titleOverride,
      channelListingId,
      platform: channelListing.platform
    })
  }

  // Check price conflict
  if (
    channelListing.priceOverride &&
    parseFloat(channelListing.priceOverride.toString()) !== parseFloat(master.basePrice.toString())
  ) {
    conflicts.push({
      type: 'PRICE',
      field: 'price',
      masterValue: master.basePrice,
      platformValue: channelListing.priceOverride,
      channelListingId,
      platform: channelListing.platform
    })
  }

  // Check description conflict
  if (
    channelListing.descriptionOverride &&
    channelListing.descriptionOverride !== master.description
  ) {
    conflicts.push({
      type: 'DESCRIPTION',
      field: 'description',
      masterValue: master.description,
      platformValue: channelListing.descriptionOverride,
      channelListingId,
      platform: channelListing.platform
    })
  }

  return conflicts
}

/**
 * Resolve a conflict using specified policy
 */
export async function resolveConflict(
  conflict: ConflictData,
  policy: ResolutionPolicy,
  userId?: string,
  customValue?: any
): Promise<{ success: boolean; message: string }> {
  try {
    const channelListing = await db.channelListing.findUnique({
      where: { id: conflict.channelListingId },
      include: {
        masterProduct: true
      }
    })

    if (!channelListing || !channelListing.masterProduct) {
      return {
        success: false,
        message: 'Channel listing or master product not found'
      }
    }

    let resolvedValue: any
    let updateMaster = false
    let updateChannel = false

    // Determine resolution based on policy
    switch (policy) {
      case 'PLATFORM_WINS':
        resolvedValue = conflict.platformValue
        updateMaster = true
        break

      case 'MASTER_WINS':
        resolvedValue = conflict.masterValue
        updateChannel = true
        break

      case 'MANUAL':
        if (customValue === undefined) {
          return {
            success: false,
            message: 'Custom value required for manual resolution'
          }
        }
        resolvedValue = customValue
        updateMaster = true
        updateChannel = true
        break

      default:
        return {
          success: false,
          message: 'Invalid resolution policy'
        }
    }

    // Apply resolution
    if (updateMaster) {
      const masterUpdate: any = {}
      
      switch (conflict.type) {
        case 'TITLE':
          masterUpdate.title = resolvedValue
          break
        case 'PRICE':
          masterUpdate.basePrice = resolvedValue
          break
        case 'DESCRIPTION':
          masterUpdate.description = resolvedValue
          break
      }

      if (Object.keys(masterUpdate).length > 0) {
        await db.masterProduct.update({
          where: { id: channelListing.masterProductId },
          data: masterUpdate
        })
      }
    }

    if (updateChannel) {
      const channelUpdate: any = {}
      
      switch (conflict.type) {
        case 'TITLE':
          channelUpdate.titleOverride = resolvedValue
          break
        case 'PRICE':
          channelUpdate.priceOverride = resolvedValue
          break
        case 'DESCRIPTION':
          channelUpdate.descriptionOverride = resolvedValue
          break
      }

      if (Object.keys(channelUpdate).length > 0) {
        await db.channelListing.update({
          where: { id: conflict.channelListingId },
          data: channelUpdate
        })
      }
    }

    // Log the resolution
    if (userId) {
      await db.changeLog.create({
        data: {
          userId,
          entityType: 'conflict_resolution',
          entityId: conflict.channelListingId,
          field: conflict.field,
          oldValue: conflict.masterValue,
          newValue: resolvedValue,
          source: 'conflict_resolution',
          sourceId: policy,
          platform: conflict.platform
        }
      })
    }

    return {
      success: true,
      message: `Conflict resolved using ${policy} policy`
    }

  } catch (error) {
    console.error('Error resolving conflict:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Detect and auto-resolve conflicts for all channel listings of a master product
 */
export async function detectAndResolveAllConflicts(
  masterProductId: string,
  policy: ResolutionPolicy,
  userId?: string
): Promise<{
  detected: number
  resolved: number
  failed: number
}> {
  const channelListings = await db.channelListing.findMany({
    where: { masterProductId }
  })

  let detected = 0
  let resolved = 0
  let failed = 0

  for (const listing of channelListings) {
    const conflicts = await detectConflicts(listing.id)
    detected += conflicts.length

    for (const conflict of conflicts) {
      const result = await resolveConflict(conflict, policy, userId)
      if (result.success) {
        resolved++
      } else {
        failed++
      }
    }
  }

  return { detected, resolved, failed }
}

/**
 * Get conflict summary for a store
 */
export async function getConflictSummary(storeConnectionId: string): Promise<{
  totalConflicts: number
  byType: Record<ConflictType, number>
}> {
  const channelListings = await db.channelListing.findMany({
    where: { storeConnectionId }
  })

  let totalConflicts = 0
  const byType: Record<string, number> = {
    PRICE: 0,
    TITLE: 0,
    DESCRIPTION: 0,
    INVENTORY: 0,
    STATUS: 0
  }

  for (const listing of channelListings) {
    const conflicts = await detectConflicts(listing.id)
    totalConflicts += conflicts.length

    for (const conflict of conflicts) {
      byType[conflict.type]++
    }
  }

  return {
    totalConflicts,
    byType: byType as Record<ConflictType, number>
  }
}