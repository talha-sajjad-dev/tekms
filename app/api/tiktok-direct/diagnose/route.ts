import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const appId = process.env.TIKTOK_APP_ID || '7557173102922237964'
  const appKey = process.env.TIKTOK_CLIENT_ID || 'sbawlkhjww8r7sef4q'
  const redirectUri = 'http://localhost:3000/api/tiktok-direct/callback'
  const state = 'test123'

  // Try different OAuth URL formats
  const variants = [
    {
      name: 'Standard OAuth with App Key',
      url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    },
    {
      name: 'Standard OAuth with App ID', 
      url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    },
    {
      name: 'With client_id parameter',
      url: `https://auth.tiktok-shops.com/oauth/authorize?client_id=${appKey}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    },
    {
      name: 'With service_id=7',
      url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&service_id=7&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    },
    {
      name: 'API Key Auth (Direct)',
      url: 'N/A - Use app_key and app_secret directly in API requests instead of OAuth',
      note: 'Some sandbox apps use API key authentication instead of OAuth flow'
    }
  ]

  return NextResponse.json({
    credentials: {
      app_id: appId,
      app_key: appKey,
      redirect_uri: redirectUri
    },
    oauth_url_variants: variants,
    recommendation: 'Try each URL variant in your browser. If all fail with "invalid client_key", the sandbox might require direct API key authentication instead of OAuth. Check TikTok docs for "API Key Authentication" or "Direct API Access".'
  })
}