import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    app_key: process.env.TIKTOK_CLIENT_ID || 'sbawlkhjww8r7sef4q',
    app_secret_set: !!(process.env.TIKTOK_CLIENT_SECRET || '05T8DtbLtKsPI26cdq6n772OcGvbFLMw'),
    is_sandbox: process.env.TIKTOK_SANDBOX === 'true',
    redirect_uri: process.env.NEXTAUTH_URL 
      ? `${process.env.NEXTAUTH_URL}/api/tiktok-direct/callback`
      : `http://localhost:3000/api/tiktok-direct/callback`,
    auth_url_template: 'https://auth.tiktok-shops.com/oauth/authorize'
  })
}