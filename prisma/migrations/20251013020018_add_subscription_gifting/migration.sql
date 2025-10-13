-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "giftDuration" INTEGER,
ADD COLUMN     "giftExpiresAt" TIMESTAMP(3),
ADD COLUMN     "giftNote" TEXT,
ADD COLUMN     "giftStartedAt" TIMESTAMP(3),
ADD COLUMN     "giftedBy" TEXT,
ADD COLUMN     "isGifted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Subscription_isGifted_giftExpiresAt_idx" ON "Subscription"("isGifted", "giftExpiresAt");
