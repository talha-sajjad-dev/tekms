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

    const { role } = await req.json()

    if (!["USER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Prevent removing last admin
    if (role === "USER") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin user" },
          { status: 400 }
        )
      }
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { role },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update role error:", error)
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}