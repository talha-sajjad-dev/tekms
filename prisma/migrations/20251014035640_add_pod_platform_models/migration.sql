-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "channelListingId" TEXT,
ADD COLUMN     "masterProductId" TEXT;

-- CreateTable
CREATE TABLE "MasterProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "baseSKU" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "category" TEXT,
    "tags" TEXT[],
    "templateId" TEXT,
    "designIds" TEXT[],
    "images" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "storeConnectionId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT,
    "titleOverride" TEXT,
    "descriptionOverride" TEXT,
    "priceOverride" DECIMAL(10,2),
    "platformCategories" TEXT[],
    "platformTags" TEXT[],
    "platformData" JSONB,
    "publishStatus" TEXT NOT NULL DEFAULT 'draft',
    "publishError" TEXT,
    "lastPushedAt" TIMESTAMP(3),
    "lastPulledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterVariant" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "optionValues" JSONB NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "compareAtPrice" DECIMAL(10,2),
    "imageOverrides" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelVariant" (
    "id" TEXT NOT NULL,
    "masterVariantId" TEXT NOT NULL,
    "channelListingId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "platformSKU" TEXT,
    "platformPrice" DECIMAL(10,2),
    "platformData" JSONB,

    CONSTRAINT "ChannelVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterProductId" TEXT,
    "masterVariantId" TEXT,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "channelAllocations" JSONB,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appliesTo" TEXT NOT NULL,
    "storeIds" TEXT[],
    "productIds" TEXT[],
    "tags" TEXT[],
    "ruleType" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "platformRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "priceBySize" JSONB,
    "variantOptions" JSONB NOT NULL,
    "designSlots" JSONB,
    "weight" DECIMAL(10,2),
    "dimensions" JSONB,
    "defaultTags" TEXT[],
    "defaultCategories" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "tags" TEXT[],
    "collections" TEXT[],
    "usedInProducts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "etsyTaxonomyId" INTEGER,
    "bcCategoryId" INTEGER,
    "shopifyCollection" TEXT,
    "tiktokCategoryId" TEXT,
    "keywords" TEXT[],
    "pattern" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "platform" "Platform",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "storeConnectionId" TEXT,
    "platform" "Platform" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterProduct_userId_status_idx" ON "MasterProduct"("userId", "status");

-- CreateIndex
CREATE INDEX "MasterProduct_baseSKU_idx" ON "MasterProduct"("baseSKU");

-- CreateIndex
CREATE INDEX "MasterProduct_userId_createdAt_idx" ON "MasterProduct"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelListing_userId_idx" ON "ChannelListing"("userId");

-- CreateIndex
CREATE INDEX "ChannelListing_masterProductId_idx" ON "ChannelListing"("masterProductId");

-- CreateIndex
CREATE INDEX "ChannelListing_publishStatus_idx" ON "ChannelListing"("publishStatus");

-- CreateIndex
CREATE INDEX "ChannelListing_storeConnectionId_publishStatus_idx" ON "ChannelListing"("storeConnectionId", "publishStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelListing_storeConnectionId_externalId_key" ON "ChannelListing"("storeConnectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterVariant_sku_key" ON "MasterVariant"("sku");

-- CreateIndex
CREATE INDEX "MasterVariant_masterProductId_idx" ON "MasterVariant"("masterProductId");

-- CreateIndex
CREATE INDEX "MasterVariant_sku_idx" ON "MasterVariant"("sku");

-- CreateIndex
CREATE INDEX "ChannelVariant_masterVariantId_idx" ON "ChannelVariant"("masterVariantId");

-- CreateIndex
CREATE INDEX "ChannelVariant_channelListingId_idx" ON "ChannelVariant"("channelListingId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelVariant_channelListingId_externalId_key" ON "ChannelVariant"("channelListingId", "externalId");

-- CreateIndex
CREATE INDEX "InventoryLevel_userId_idx" ON "InventoryLevel"("userId");

-- CreateIndex
CREATE INDEX "InventoryLevel_available_idx" ON "InventoryLevel"("available");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLevel_masterProductId_key" ON "InventoryLevel"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLevel_masterVariantId_key" ON "InventoryLevel"("masterVariantId");

-- CreateIndex
CREATE INDEX "PricingRule_userId_isActive_idx" ON "PricingRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_priority_idx" ON "PricingRule"("priority");

-- CreateIndex
CREATE INDEX "ProductTemplate_userId_isActive_idx" ON "ProductTemplate"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ProductTemplate_category_idx" ON "ProductTemplate"("category");

-- CreateIndex
CREATE INDEX "DesignLibrary_userId_idx" ON "DesignLibrary"("userId");

-- CreateIndex
CREATE INDEX "DesignLibrary_tags_idx" ON "DesignLibrary"("tags");

-- CreateIndex
CREATE INDEX "CategoryMapping_userId_idx" ON "CategoryMapping"("userId");

-- CreateIndex
CREATE INDEX "CategoryMapping_name_idx" ON "CategoryMapping"("name");

-- CreateIndex
CREATE INDEX "ChangeLog_userId_entityType_entityId_idx" ON "ChangeLog"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeLog_createdAt_idx" ON "ChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_source_idx" ON "ChangeLog"("source");

-- CreateIndex
CREATE INDEX "WebhookEvent_platform_processed_idx" ON "WebhookEvent"("platform", "processed");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_storeConnectionId_processed_idx" ON "WebhookEvent"("storeConnectionId", "processed");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_channelListingId_fkey" FOREIGN KEY ("channelListingId") REFERENCES "ChannelListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_storeConnectionId_fkey" FOREIGN KEY ("storeConnectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterVariant" ADD CONSTRAINT "MasterVariant_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelVariant" ADD CONSTRAINT "ChannelVariant_masterVariantId_fkey" FOREIGN KEY ("masterVariantId") REFERENCES "MasterVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelVariant" ADD CONSTRAINT "ChannelVariant_channelListingId_fkey" FOREIGN KEY ("channelListingId") REFERENCES "ChannelListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_masterVariantId_fkey" FOREIGN KEY ("masterVariantId") REFERENCES "MasterVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignLibrary" ADD CONSTRAINT "DesignLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryMapping" ADD CONSTRAINT "CategoryMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_storeConnectionId_fkey" FOREIGN KEY ("storeConnectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
