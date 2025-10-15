import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/templates - List all templates for user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    // Build query filters
    const where: any = {
      userId: session.user.id,
    };

    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const templates = await db.productTemplate.findMany({
      where,
      orderBy: [
        { useCount: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // Serialize Decimal fields
    const serializedTemplates = templates.map(template => ({
      ...template,
      basePrice: template.basePrice.toString(),
      weight: template.weight?.toString() || null,
    }));

    return NextResponse.json({
      success: true,
      templates: serializedTemplates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new template
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
    } = body;

    // Validate required fields
    if (!name || !basePrice || !variantOptions) {
      return NextResponse.json(
        { error: "Missing required fields: name, basePrice, variantOptions" },
        { status: 400 }
      );
    }

    // Validate price is a valid number
    const priceNum = parseFloat(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { error: "Invalid base price" },
        { status: 400 }
      );
    }

    // Validate variantOptions is an object
    if (typeof variantOptions !== "object" || Array.isArray(variantOptions)) {
      return NextResponse.json(
        { error: "variantOptions must be an object" },
        { status: 400 }
      );
    }

    // Validate option values don't exceed 20 characters
    for (const [optionName, values] of Object.entries(variantOptions)) {
      if (Array.isArray(values)) {
        for (const value of values) {
          if (typeof value === 'string' && value.length > 20) {
            return NextResponse.json(
              { error: `Option value "${value}" exceeds 20 character limit` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Create template
    const template = await db.productTemplate.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        category: category || null,
        basePrice: priceNum,
        priceBySize: priceBySize || null,
        variantOptions,
        designSlots: designSlots || null,
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        defaultTags: defaultTags || [],
        defaultCategories: defaultCategories || null,
        isActive: true,
        useCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        basePrice: template.basePrice.toString(),
        weight: template.weight?.toString() || null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}