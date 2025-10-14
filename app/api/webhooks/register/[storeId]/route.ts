import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { registerWebhooksForStore } from '@/lib/webhooks/webhook-manager'

/**
 * Register webhooks for a store connection
 * POST /api/webhooks/register/[storeId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { storeId } = params

    // Get the base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`

    // Register webhooks
    const result = await registerWebhooksForStore(storeId, baseUrl)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to register some webhooks',
          details: result.errors
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      webhooks: result.registeredWebhooks,
      message: `Successfully registered ${result.registeredWebhooks.length} webhooks`
    })

  } catch (error) {
    console.error('Error registering webhooks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}