import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * Verify maintenance bypass password
 * POST /api/maintenance/unlock
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password required', success: false },
        { status: 400 }
      )
    }
    
    // Get the stored password from settings
    const setting = await db.settings.findUnique({
      where: { key: 'general.maintenance_password' }
    })
    
    if (!setting || !setting.value) {
      return NextResponse.json(
        { error: 'No bypass password configured', success: false },
        { status: 400 }
      )
    }
    
    // Verify password
    if (password === setting.value) {
      // Set a secure cookie to remember the bypass
      // Cookie expires in 24 hours
      const response = NextResponse.json({ 
        success: true,
        message: 'Access granted' 
      })
      
      response.cookies.set('maintenance_bypass', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      })
      
      return response
    } else {
      return NextResponse.json(
        { error: 'Invalid password', success: false },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('Maintenance unlock error:', error)
    return NextResponse.json(
      { error: 'Failed to verify password', success: false },
      { status: 500 }
    )
  }
}