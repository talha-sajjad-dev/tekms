import * as jose from 'jose'
import type { OAuthTokenResponse, SignedPayload } from '@/types/bigcommerce-app'

const CLIENT_ID = process.env.BIGCOMMERCE_CLIENT_ID!
const CLIENT_SECRET = process.env.BIGCOMMERCE_CLIENT_SECRET!
const APP_URL = process.env.BIGCOMMERCE_APP_URL!
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  scope: string,
  context: string
): Promise<OAuthTokenResponse> {
  const tokenUrl = 'https://login.bigcommerce.com/oauth2/token'
  
  const params = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    scope,
    grant_type: 'authorization_code',
    redirect_uri: `${APP_URL}/api/auth/callback`,
    context
  }
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Token exchange failed:', error)
    throw new Error('Failed to exchange code for token')
  }
  
  return response.json()
}

/**
 * Verify and decode signed payload from BigCommerce
 */
export async function verifySignedPayload(signedPayload: string): Promise<SignedPayload> {
  try {
    const [encodedData, encodedSignature] = signedPayload.split('.')
    
    if (!encodedData || !encodedSignature) {
      throw new Error('Invalid signed payload format')
    }
    
    // Decode the payload
    const jsonStr = Buffer.from(encodedData, 'base64').toString('utf-8')
    const payload = JSON.parse(jsonStr) as SignedPayload
    
    // Verify signature
    const data = Buffer.from(encodedData, 'base64')
    const signature = Buffer.from(encodedSignature, 'base64')
    const secret = Buffer.from(CLIENT_SECRET, 'utf-8')
    
    const crypto = await import('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest()
    
    if (!crypto.timingSafeEqual(signature, expectedSignature)) {
      throw new Error('Invalid signature')
    }
    
    // Verify timestamp (not older than 1 hour)
    const now = Math.floor(Date.now() / 1000)
    if (now - payload.timestamp > 3600) {
      throw new Error('Signed payload expired')
    }
    
    return payload
  } catch (error) {
    console.error('Error verifying signed payload:', error)
    throw new Error('Invalid signed payload')
  }
}

/**
 * Create JWT for session management
 */
export async function createJWT(payload: any): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  
  return jwt
}

/**
 * Verify JWT
 */
export async function verifyJWT(token: string): Promise<any> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract store hash from context
 */
export function extractStoreHash(context: string): string {
  // Context format: "stores/{store_hash}"
  return context.replace('stores/', '')
}