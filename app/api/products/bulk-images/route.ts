import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productIds, imageUrls } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs are required' },
        { status: 400 }
      );
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Image URLs are required' },
        { status: 400 }
      );
    }

    // Verify products belong to user
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeConnection: {
          userId: session.user.id
        }
      },
      include: {
        storeConnection: true
      }
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid products found' },
        { status: 404 }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // Update each product with images
    for (const product of products) {
      try {
        // Get existing images
        let existingImages: any = product.images || { images: [] };
        
        // Ensure images structure exists
        if (!existingImages.images || !Array.isArray(existingImages.images)) {
          existingImages = { images: [] };
        }

        // Add new images
        const newImages = imageUrls.map((url, index) => ({
          url_thumbnail: url,
          url_standard: url,
          url: url,
          is_thumbnail: index === 0 && existingImages.images.length === 0, // First image is thumbnail if no existing
          sort_order: existingImages.images.length + index
        }));

        existingImages.images = [...existingImages.images, ...newImages];

        // Update product in database
        await prisma.product.update({
          where: { id: product.id },
          data: {
            images: existingImages,
            updatedAt: new Date()
          }
        });

        // If product has externalId and store connection, update on platform
        if (product.externalId && product.storeConnection) {
          try {
            if (product.storeConnection.platform === 'BIGCOMMERCE') {
              // Update BigCommerce product images
              const bcImages = imageUrls.map((url, index) => ({
                image_url: url,
                is_thumbnail: index === 0 && existingImages.images.length === 1,
                sort_order: existingImages.images.length + index
              }));

              // Note: This would require BigCommerce API call
              // await updateBigCommerceProductImages(product.externalId, bcImages);
            }
          } catch (platformError) {
            console.error(`Failed to update platform for product ${product.id}:`, platformError);
            errors.push(`Platform update failed for ${product.name}`);
          }
        }

        updatedCount++;
      } catch (error) {
        console.error(`Error updating product ${product.id}:`, error);
        errors.push(`Failed to update ${product.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalRequested: productIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully added images to ${updatedCount} product(s)`
    });

  } catch (error) {
    console.error('Bulk image upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}