import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SubscriptionTier } from '@prisma/client'

/**
 * POST - Gift a subscription to a user (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, tier, duration, note } = await req.json()

    if (!userId || !tier || !duration) {
      return NextResponse.json(
        { error: 'userId, tier, and duration are required' },
        { status: 400 }
      )
    }

    // Validate tier
    const validTiers: SubscriptionTier[] = ['FREE', 'PAID', 'ENTERPRISE']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be FREE, PAID, or ENTERPRISE' },
        { status: 400 }
      )
    }

    // Validate duration
    const validDurations = [1, 3, 12]
    if (!validDurations.includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 1, 3, or 12 months' },
        { status: 400 }
      )
    }

    // Calculate expiration date
    const giftStartedAt = new Date()
    const giftExpiresAt = new Date()
    giftExpiresAt.setMonth(giftExpiresAt.getMonth() + duration)

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update or create subscription
    if (user.subscription) {
      // Update existing subscription
      await db.subscription.update({
        where: { userId },
        data: {
          tier,
          status: 'ACTIVE',
          isGifted: true,
          giftedBy: session.user.id,
          giftDuration: duration,
          giftStartedAt,
          giftExpiresAt,
          giftNote: note || null
        }
      })
    } else {
      // Create new subscription
      await db.subscription.create({
        data: {
          userId,
          tier,
          status: 'ACTIVE',
          isGifted: true,
          giftedBy: session.user.id,
          giftDuration: duration,
          giftStartedAt,
          giftExpiresAt,
          giftNote: note || null
        }
      })
    }

    // Send notification email to user
    try {
      const { sendEmail } = await import('@/lib/email/send')
      await sendEmail({
        to: user.email,
        subject: `You've received a ${tier} subscription gift!`,
        template: 'subscription_gifted',
        data: {
          userName: user.name || user.email,
          tier,
          duration,
          expiresAt: giftExpiresAt.toLocaleDateString(),
          note: note || ''
        }
      }).catch(err => console.error('Failed to send gift email:', err))
    } catch (emailError) {
      console.error('Email service error:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: `Gifted ${tier} subscription for ${duration} month(s)`,
      expiresAt: giftExpiresAt.toISOString()
    })
  } catch (error) {
    console.error('Error gifting subscription:', error)
    return NextResponse.json(
      { error: 'Failed to gift subscription' },
      { status: 500 }
    )
  }
}