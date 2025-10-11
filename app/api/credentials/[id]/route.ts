import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if credential belongs to user
    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    })

    if (!credential || credential.userId !== user.id) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      )
    }

    await prisma.userCredential.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete credential error:", error)
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    )
  }
}

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const { isActive } = await req.json()

    // Check if credential belongs to user
    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    })

    if (!credential || credential.userId !== user.id) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      )
    }

    const updated = await prisma.userCredential.update({
      where: { id: params.id },
      data: { isActive },
      select: {
        id: true,
        platform: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ credential: updated })
  } catch (error: any) {
    console.error("Update credential error:", error)
    return NextResponse.json(
      { error: "Failed to update credential" },
      { status: 500 }
    )
  }
}