/*
  Warnings:

  - The values [STARTER,PROFESSIONAL] on the enum `SubscriptionTier` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[userId,platform,externalId,importMethod]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionTier_new" AS ENUM ('FREE', 'PAID', 'ENTERPRISE');
ALTER TABLE "public"."Subscription" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "tier" TYPE "SubscriptionTier_new" USING ("tier"::text::"SubscriptionTier_new");
ALTER TABLE "PricingPlan" ALTER COLUMN "tier" TYPE "SubscriptionTier_new" USING ("tier"::text::"SubscriptionTier_new");
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";
DROP TYPE "public"."SubscriptionTier_old";
ALTER TABLE "Subscription" ALTER COLUMN "tier" SET DEFAULT 'FREE';
COMMIT;

-- DropIndex
DROP INDEX "public"."Product_userId_platform_externalId_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "importMethod" TEXT NOT NULL DEFAULT 'oauth',
ADD COLUMN     "platformData" JSONB,
ADD COLUMN     "storeConnectionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowLegacyEtsyImport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowLegacyTikTokExport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserCredential" ADD COLUMN     "isLegacy" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "StoreConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeUrl" TEXT,
    "externalStoreId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "syncError" TEXT,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSubscription" (
    "id" TEXT NOT NULL,
    "storeConnectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "pricingTierId" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePricingTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minProducts" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2),
    "stripePriceId" TEXT,
    "stripeYearlyPriceId" TEXT,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreConnection_userId_platform_idx" ON "StoreConnection"("userId", "platform");

-- CreateIndex
CREATE INDEX "StoreConnection_userId_isActive_idx" ON "StoreConnection"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StoreConnection_userId_platform_externalStoreId_key" ON "StoreConnection"("userId", "platform", "externalStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_storeConnectionId_key" ON "StoreSubscription"("storeConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSubscription_stripeSubscriptionId_key" ON "StoreSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "StoreSubscription_userId_idx" ON "StoreSubscription"("userId");

-- CreateIndex
CREATE INDEX "StoreSubscription_storeConnectionId_idx" ON "StoreSubscription"("storeConnectionId");

-- CreateIndex
CREATE INDEX "StoreSubscription_stripeSubscriptionId_idx" ON "StoreSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "StorePricingTier_isActive_displayOrder_idx" ON "StorePricingTier"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "StorePricingTier_minProducts_maxProducts_idx" ON "StorePricingTier"("minProducts", "maxProducts");

-- CreateIndex
CREATE INDEX "Product_storeConnectionId_idx" ON "Product"("storeConnectionId");

-- CreateIndex
CREATE INDEX "Product_importMethod_idx" ON "Product"("importMethod");

-- CreateIndex
CREATE UNIQUE INDEX "Product_userId_platform_externalId_importMethod_key" ON "Product"("userId", "platform", "externalId", "importMethod");

-- AddForeignKey
ALTER TABLE "StoreConnection" ADD CONSTRAINT "StoreConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_storeConnectionId_fkey" FOREIGN KEY ("storeConnectionId") REFERENCES "StoreConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "StorePricingTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeConnectionId_fkey" FOREIGN KEY ("storeConnectionId") REFERENCES "StoreConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
