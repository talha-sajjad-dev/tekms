import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { tier } = await req.json()

    if (!["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier" },
        { status: 400 }
      )
    }

    // Update or create subscription
    await prisma.subscription.upsert({
      where: { userId: params.id },
      update: { tier },
      create: {
        userId: params.id,
        tier,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update subscription error:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}