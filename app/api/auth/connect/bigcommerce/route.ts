import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectBigCommerceStore, testBigCommerceCredentials } from '@/lib/platforms/bigcommerce/connect'
import { canConnectStore } from '@/lib/auth/permissions'

/**
 * Connect BigCommerce store (manual token entry)
 * POST /api/auth/connect/bigcommerce
 * Body: { storeHash: "abc123", accessToken: "xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { storeHash, accessToken } = await req.json()
    
    if (!storeHash || !accessToken) {
      return NextResponse.json(
        { error: 'Store hash and access token are required' },
        { status: 400 }
      )
    }
    
    // Check if user can connect another store
    const canConnect = await canConnectStore(session.user.id, 'BIGCOMMERCE')
    
    if (!canConnect.allowed) {
      return NextResponse.json(
        { 
          error: canConnect.reason,
          limit: canConnect.limit,
          upgrade: true
        },
        { status: 403 }
      )
    }
    
    // Test credentials first
    const test = await testBigCommerceCredentials(storeHash, accessToken)
    
    if (!test.valid) {
      return NextResponse.json(
        { error: test.error || 'Invalid credentials' },
        { status: 400 }
      )
    }
    
    // Connect the store
    const result = await connectBigCommerceStore(
      session.user.id,
      storeHash,
      accessToken
    )
    
    return NextResponse.json({
      success: true,
      storeName: result.storeName,
      storeId: result.storeId
    })
    
  } catch (error) {
    console.error('BigCommerce connection error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect BigCommerce store',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}