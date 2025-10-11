import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAllSettings, setSetting, initializeDefaultSettings } from "@/lib/settings"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    // Initialize default settings if needed
    const count = await prisma.settings.count()
    if (count === 0) {
      await initializeDefaultSettings()
    }

    const settings = await getAllSettings()

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error("Get settings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const { key, value, type, category, description, isPublic } = await req.json()

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    await setSetting(key, value, {
      type: type || "string",
      category: category || "general",
      description,
      isPublic: isPublic || false,
      updatedBy: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update setting error:", error)
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}