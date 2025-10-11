import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserTotalBill } from '@/lib/stripe/subscriptions'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const billingData = await getUserTotalBill(user.id)

    return NextResponse.json(billingData)
  } catch (error: any) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}