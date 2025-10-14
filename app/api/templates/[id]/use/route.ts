import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/templates/[id]/use - Create product from template
export async function POST(
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

    // Get template
    const template = await db.productTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      designIds = [],
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      );
    }

    // Generate base SKU from title
    const baseSKU = `${title.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}-${Date.now()}`;

    // Create master product from template
    const masterProduct = await db.masterProduct.create({
      data: {
        userId: session.user.id,
        title,
        description: description || template.description || null,
        baseSKU,
        basePrice: template.basePrice,
        category: template.category,
        tags: template.defaultTags,
        templateId: template.id,
        designIds,
        status: 'DRAFT',
      },
    });

    // Create variants from template options
    const variantOptions = template.variantOptions as Record<string, string[]>;
    const variants = [];

    // Generate all combinations of variant options
    const optionNames = Object.keys(variantOptions);
    const generateCombinations = (index: number, current: Record<string, string>): void => {
      if (index === optionNames.length) {
        variants.push({ ...current });
        return;
      }

      const optionName = optionNames[index];
      const optionValues = variantOptions[optionName];

      for (const value of optionValues) {
        current[optionName] = value;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});

    // Create variant records
    const priceBySize = (template.priceBySize as Record<string, number>) || {};
    const createdVariants = [];

    for (const [index, variantOption] of variants.entries()) {
      // Calculate variant price (basePrice + size adjustment)
      let variantPrice = template.basePrice;
      const size = variantOption.Size || variantOption.size;
      if (size && priceBySize[size] !== undefined) {
        variantPrice = template.basePrice.add(priceBySize[size]);
      }

      // Generate variant SKU
      const optionSuffix = Object.values(variantOption).join('-').replace(/[^a-zA-Z0-9]/g, '-');
      const variantSKU = `${baseSKU}-${optionSuffix}`;

      const variant = await db.masterVariant.create({
        data: {
          masterProductId: masterProduct.id,
          sku: variantSKU,
          optionValues: variantOption,
          price: variantPrice,
          imageOverrides: [],
        },
      });

      createdVariants.push(variant);
    }

    // Increment template use count
    await db.productTemplate.update({
      where: { id: template.id },
      data: {
        useCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      masterProduct: {
        ...masterProduct,
        basePrice: masterProduct.basePrice.toString(),
        compareAtPrice: masterProduct.compareAtPrice?.toString() || null,
      },
      variants: createdVariants.map(v => ({
        ...v,
        price: v.price?.toString() || null,
        compareAtPrice: v.compareAtPrice?.toString() || null,
      })),
      message: `Created product with ${createdVariants.length} variants`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating product from template:", error);
    return NextResponse.json(
      { error: "Failed to create product from template" },
      { status: 500 }
    );
  }
}