import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'

/**
 * Sync products from store
 * POST /api/stores/[id]/sync
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const store = await db.storeConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }
    
    if (!store.isActive) {
      return NextResponse.json(
        { error: 'Store is inactive' },
        { status: 400 }
      )
    }
    
    // Decrypt access token
    const accessToken = decrypt(store.accessToken)
    
    // Platform-specific sync logic
    let productCount = 0
    
    switch (store.platform) {
      case 'SHOPIFY':
        productCount = await syncShopifyProducts(store, accessToken)
        break
      case 'ETSY':
        productCount = await syncEtsyProducts(store, accessToken)
        break
      case 'BIGCOMMERCE':
        productCount = await syncBigCommerceProducts(store, accessToken)
        break
      case 'TIKTOK':
        productCount = await syncTikTokProducts(store, accessToken)
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        )
    }
    
    // Update last synced time
    await db.storeConnection.update({
      where: { id: store.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'connected',
        syncError: null
      }
    })
    
    return NextResponse.json({
      success: true,
      productCount
    })
    
  } catch (error) {
    console.error('Store sync error:', error)
    
    // Update sync error
    try {
      await db.storeConnection.update({
        where: { id: params.id },
        data: {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    } catch (updateError) {
      console.error('Failed to update sync error:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Failed to sync store', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Platform-specific sync functions (placeholders for now)
async function syncShopifyProducts(store: any, accessToken: string): Promise<number> {
  // Will implement full Shopify product import
  // For now, just return mock count
  return 0
}

async function syncEtsyProducts(store: any, accessToken: string): Promise<number> {
  // Will implement Etsy product import
  return 0
}

async function syncBigCommerceProducts(store: any, accessToken: string): Promise<number> {
  // Will implement BigCommerce product import  
  return 0
}

async function syncTikTokProducts(store: any, accessToken: string): Promise<number> {
  // Will implement TikTok product import
  return 0
}