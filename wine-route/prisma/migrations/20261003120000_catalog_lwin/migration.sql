-- AlterTable
ALTER TABLE "CrawlRun" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'prices';

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "catalogUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "crawlConsentAt" TIMESTAMP(3),
ADD COLUMN     "crawlConsentNote" TEXT;

-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "lwin" TEXT,
ADD COLUMN     "notesSrc" TEXT;

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "bottleMl" INTEGER NOT NULL DEFAULT 750,
    "vintage" INTEGER,
    "gtin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "wineId" TEXT,
    "suggestId" TEXT,
    "suggestScore" DOUBLE PRECISION,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LwinRef" (
    "lwin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "producer" TEXT,
    "wine" TEXT,
    "country" TEXT,
    "region" TEXT,
    "subRegion" TEXT,
    "colour" TEXT,
    "type" TEXT,
    "status" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LwinRef_pkey" PRIMARY KEY ("lwin")
);

-- CreateIndex
CREATE INDEX "CatalogItem_status_sellerId_idx" ON "CatalogItem"("status", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_sellerId_url_key" ON "CatalogItem"("sellerId", "url");

-- CreateIndex
CREATE INDEX "LwinRef_displayName_idx" ON "LwinRef"("displayName");

-- CreateIndex
CREATE INDEX "Wine_lwin_idx" ON "Wine"("lwin");

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

