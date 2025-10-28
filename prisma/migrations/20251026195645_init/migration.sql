-- AlterTable
ALTER TABLE "ChannelListing" ALTER COLUMN "masterProductId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SyncJob" ADD COLUMN     "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "currentStage" TEXT,
ADD COLUMN     "estimatedTimeRemaining" INTEGER,
ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stages" JSONB;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "inventoryLevel" INTEGER NOT NULL DEFAULT 0,
    "inventoryTracking" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(10,2),
    "weightUnit" TEXT,
    "optionValues" JSONB NOT NULL,
    "images" JSONB,
    "dimensions" JSONB,
    "platformData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModifier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "values" JSONB,
    "validation" JSONB,
    "platformData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCustomField" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSEO" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "searchKeywords" TEXT[],
    "urlSlug" TEXT,
    "platformSEO" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSEO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductShipping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "weight" DECIMAL(10,2),
    "weightUnit" TEXT,
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "depth" DECIMAL(10,2),
    "dimensionUnit" TEXT,
    "fixedCost" DECIMAL(10,2),
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductShipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "locationId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "tracking" TEXT NOT NULL,
    "warningLevel" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBulkPricing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBulkPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossListing" (
    "id" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetStoreId" TEXT NOT NULL,
    "targetPlatform" "Platform" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "priceAdjustment" JSONB,
    "categoryMapping" JSONB,
    "tagMapping" JSONB,
    "externalId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_platform_externalId_key" ON "ProductVariant"("productId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "ProductModifier_productId_idx" ON "ProductModifier"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModifier_productId_platform_externalId_key" ON "ProductModifier"("productId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_platform_externalId_key" ON "ProductOption"("productId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "ProductCustomField_productId_idx" ON "ProductCustomField"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCustomField_productId_platform_name_key" ON "ProductCustomField"("productId", "platform", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSEO_productId_key" ON "ProductSEO"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductShipping_productId_key" ON "ProductShipping"("productId");

-- CreateIndex
CREATE INDEX "ProductInventory_productId_idx" ON "ProductInventory"("productId");

-- CreateIndex
CREATE INDEX "ProductInventory_quantity_idx" ON "ProductInventory"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_productId_variantId_locationId_key" ON "ProductInventory"("productId", "variantId", "locationId");

-- CreateIndex
CREATE INDEX "ProductBulkPricing_productId_idx" ON "ProductBulkPricing"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_productId_platform_key" ON "ProductReview"("productId", "platform");

-- CreateIndex
CREATE INDEX "CrossListing_status_idx" ON "CrossListing"("status");

-- CreateIndex
CREATE INDEX "CrossListing_sourceProductId_idx" ON "CrossListing"("sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "CrossListing_sourceProductId_targetStoreId_key" ON "CrossListing"("sourceProductId", "targetStoreId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifier" ADD CONSTRAINT "ProductModifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustomField" ADD CONSTRAINT "ProductCustomField_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSEO" ADD CONSTRAINT "ProductSEO_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShipping" ADD CONSTRAINT "ProductShipping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBulkPricing" ADD CONSTRAINT "ProductBulkPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossListing" ADD CONSTRAINT "CrossListing_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
