import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/encryption"

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

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const credentials = await prisma.userCredential.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        platform: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ credentials })
  } catch (error: any) {
    console.error("Get credentials error:", error)
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
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

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const { platform, apiKey, label } = await req.json()

    if (!platform || !apiKey) {
      return NextResponse.json(
        { error: "Platform and API key are required" },
        { status: 400 }
      )
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Check if credential with same platform and label already exists
    const existing = await prisma.userCredential.findFirst({
      where: {
        userId: user.id,
        platform,
        label: label || null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Credential with this platform and label already exists" },
        { status: 400 }
      )
    }

    const credential = await prisma.userCredential.create({
      data: {
        userId: user.id,
        platform,
        encryptedKey,
        label: label || null,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ credential }, { status: 201 })
  } catch (error: any) {
    console.error("Create credential error:", error)
    return NextResponse.json(
      { error: "Failed to create credential" },
      { status: 500 }
    )
  }
}