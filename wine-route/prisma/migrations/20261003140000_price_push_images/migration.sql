-- AlterEnum
ALTER TYPE "AlertChannel" ADD VALUE 'PUSH';

-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "imageSrc" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "WinePrice" (
    "wineId" TEXT NOT NULL,
    "perBottle" INTEGER,
    "route" TEXT,
    "sellerCountry" TEXT,
    "krPerBottle" INTEGER,
    "saving" INTEGER,
    "exempt" BOOLEAN NOT NULL DEFAULT false,
    "ftaOrigin" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinePrice_pkey" PRIMARY KEY ("wineId")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastOkAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WinePrice_perBottle_idx" ON "WinePrice"("perBottle");

-- CreateIndex
CREATE INDEX "WinePrice_saving_idx" ON "WinePrice"("saving");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "WinePrice" ADD CONSTRAINT "WinePrice_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

