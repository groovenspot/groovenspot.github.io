-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "cooAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minBottles" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shipCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shipMethod" TEXT;

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "segment" TEXT,
    "tasteMatch" TEXT,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionStatement" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invoicedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionStatement_sellerId_month_key" ON "CommissionStatement"("sellerId", "month");

-- AddForeignKey
ALTER TABLE "CommissionStatement" ADD CONSTRAINT "CommissionStatement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

