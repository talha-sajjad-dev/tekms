import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, extractStoreHash } from '@/lib/bigcommerce-app/auth'
import { saveStore } from '@/lib/bigcommerce-app/storage'
import type { StoreData } from '@/types/bigcommerce-app'

/**
 * OAuth Callback Handler
 * Called by BigCommerce after merchant approves app installation
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const scope = searchParams.get('scope')
  const context = searchParams.get('context')
  
  console.log('OAuth callback received:', { code: !!code, scope, context })
  
  if (!code || !scope || !context) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }
  
  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code, scope, context)
    
    console.log('Token exchange successful:', { context, scope: tokenData.scope })
    
    // Extract store hash from context
    const storeHash = extractStoreHash(context)
    
    // Prepare store data
    const storeData: StoreData = {
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      storeHash,
      installedAt: new Date().toISOString(),
      user: tokenData.user
    }
    
    // Save store data to JSON file
    await saveStore(context, storeData)
    
    console.log('Store data saved:', { storeHash, context })
    
    // Redirect to load URL (admin interface)
    const redirectUrl = `${process.env.BIGCOMMERCE_APP_URL}/api/load?context=${encodeURIComponent(context)}`
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Installation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}