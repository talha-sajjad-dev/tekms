import { NextRequest, NextResponse } from 'next/server'
import { verifySignedPayload } from '@/lib/bigcommerce-app/auth'
import { removeStore } from '@/lib/bigcommerce-app/storage'

/**
 * Uninstall Callback Handler
 * Called when merchant uninstalls the app from BigCommerce
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const signedPayload = searchParams.get('signed_payload')
  
  console.log('Uninstall callback received')
  
  if (!signedPayload) {
    return NextResponse.json(
      { error: 'No signed payload provided' },
      { status: 400 }
    )
  }
  
  try {
    // Verify and decode the signed payload
    const payload = await verifySignedPayload(signedPayload)
    
    console.log('Uninstall verified for store:', payload.store_hash)
    
    // Construct context from store hash
    const context = `stores/${payload.store_hash}`
    
    // Remove store data
    await removeStore(context)
    
    console.log('Store data removed:', context)
    
    // Note: We're keeping quotes for record-keeping
    // If you want to delete quotes too, uncomment:
    // await deleteQuotesByStore(payload.store_hash)
    
    return NextResponse.json({
      success: true,
      message: 'App uninstalled successfully'
    })
  } catch (error) {
    console.error('Uninstall callback error:', error)
    return NextResponse.json(
      { error: 'Failed to uninstall app', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}