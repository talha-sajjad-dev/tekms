import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/templates/[id] - Get template details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const template = await db.productTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        basePrice: template.basePrice.toString(),
        weight: template.weight?.toString() || null,
      },
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id] - Update template
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check template exists and belongs to user
    const existing = await db.productTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      category,
      basePrice,
      priceBySize,
      variantOptions,
      designSlots,
      weight,
      dimensions,
      defaultTags,
      defaultCategories,
      isActive,
    } = body;

    // Build update data object with only provided fields
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (basePrice !== undefined) {
      const priceNum = parseFloat(basePrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { error: "Invalid base price" },
          { status: 400 }
        );
      }
      updateData.basePrice = priceNum;
    }
    if (priceBySize !== undefined) updateData.priceBySize = priceBySize;
    if (variantOptions !== undefined) {
      if (typeof variantOptions !== "object" || Array.isArray(variantOptions)) {
        return NextResponse.json(
          { error: "variantOptions must be an object" },
          { status: 400 }
        );
      }
      updateData.variantOptions = variantOptions;
    }
    if (designSlots !== undefined) updateData.designSlots = designSlots;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (defaultTags !== undefined) updateData.defaultTags = defaultTags;
    if (defaultCategories !== undefined) updateData.defaultCategories = defaultCategories;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await db.productTemplate.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        basePrice: template.basePrice.toString(),
        weight: template.weight?.toString() || null,
      },
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check template exists and belongs to user
    const existing = await db.productTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if template is being used
    if (existing._count.products > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete template that is being used by products",
          productsCount: existing._count.products 
        },
        { status: 400 }
      );
    }

    await db.productTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}