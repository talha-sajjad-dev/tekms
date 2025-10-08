import { NextRequest, NextResponse } from 'next/server'
import { verifySignedPayload } from '@/lib/bigcommerce-app/auth'
import { getStore } from '@/lib/bigcommerce-app/storage'

/**
 * Load Callback Handler
 * Called when merchant opens the app from BigCommerce admin
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const signedPayload = searchParams.get('signed_payload')
  const context = searchParams.get('context')
  
  console.log('Load callback received:', { hasSignedPayload: !!signedPayload, context })
  
  // If we have a context from redirect, use it directly
  if (context && !signedPayload) {
    console.log('Using context from redirect:', context)
    return NextResponse.redirect(
      `${process.env.BIGCOMMERCE_APP_URL}/bc-admin?context=${encodeURIComponent(context)}`
    )
  }
  
  if (!signedPayload) {
    return NextResponse.json(
      { error: 'No signed payload or context provided' },
      { status: 400 }
    )
  }
  
  try {
    // Verify and decode the signed payload
    const payload = await verifySignedPayload(signedPayload)
    
    console.log('Signed payload verified:', { storeHash: payload.store_hash })
    
    // Construct context from store hash
    const contextFromPayload = `stores/${payload.store_hash}`
    
    // Verify we have this store's data
    const store = await getStore(contextFromPayload)
    
    if (!store) {
      console.error('Store not found:', contextFromPayload)
      return NextResponse.json(
        { error: 'Store not found. Please reinstall the app.' },
        { status: 404 }
      )
    }
    
    // Redirect to admin interface
    const redirectUrl = `${process.env.BIGCOMMERCE_APP_URL}/bc-admin?context=${encodeURIComponent(contextFromPayload)}&store_hash=${payload.store_hash}`
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Load callback error:', error)
    return NextResponse.json(
      { error: 'Failed to load app', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}