-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'OUT_OF_STOCK', 'ERROR', 'SYNCING', 'PENDING_APPROVAL');

-- CreateTable
CREATE TABLE "BulkOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB,
    "productIds" TEXT[],
    "changes" JSONB,
    "results" JSONB,
    "errorLog" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentItem" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "groupBy" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "color" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "operationType" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "prompt" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "cost" DECIMAL(10,4),
    "confidence" DECIMAL(5,2),
    "userFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkOperation_userId_status_idx" ON "BulkOperation"("userId", "status");

-- CreateIndex
CREATE INDEX "BulkOperation_status_idx" ON "BulkOperation"("status");

-- CreateIndex
CREATE INDEX "BulkOperation_createdAt_idx" ON "BulkOperation"("createdAt");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_idx" ON "SavedFilter"("userId");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_isDefault_idx" ON "SavedFilter"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_isPinned_idx" ON "SavedFilter"("userId", "isPinned");

-- CreateIndex
CREATE INDEX "AIOperation_userId_operationType_idx" ON "AIOperation"("userId", "operationType");

-- CreateIndex
CREATE INDEX "AIOperation_userId_status_idx" ON "AIOperation"("userId", "status");

-- CreateIndex
CREATE INDEX "AIOperation_createdAt_idx" ON "AIOperation"("createdAt");

-- CreateIndex
CREATE INDEX "AIOperation_productId_idx" ON "AIOperation"("productId");

-- AddForeignKey
ALTER TABLE "BulkOperation" ADD CONSTRAINT "BulkOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIOperation" ADD CONSTRAINT "AIOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
