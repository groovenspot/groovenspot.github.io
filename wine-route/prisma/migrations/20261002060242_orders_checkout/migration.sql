-- CreateEnum
CREATE TYPE "CheckoutMode" AS ENUM ('PRODUCT_PAGE', 'SHOPIFY_CART', 'CART_TEMPLATE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CLICKED', 'CONFIRMED', 'SHIPPED', 'CUSTOMS', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "checkoutRef" TEXT;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "cartTpl" TEXT,
ADD COLUMN     "checkoutMode" "CheckoutMode" NOT NULL DEFAULT 'PRODUCT_PAGE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address1En" TEXT,
ADD COLUMN     "address2En" TEXT,
ADD COLUMN     "cityEn" TEXT,
ADD COLUMN     "firstNameEn" TEXT,
ADD COLUMN     "lastNameEn" TEXT,
ADD COLUMN     "pcccEnc" TEXT,
ADD COLUMN     "pcccInNote" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "provinceEn" TEXT,
ADD COLUMN     "zip" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "bottleMl" INTEGER NOT NULL,
    "estTotal" INTEGER NOT NULL,
    "estTax" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CLICKED',
    "orderRef" TEXT,
    "carrier" TEXT,
    "trackingNo" TEXT,
    "purchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "by" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_clickId_key" ON "Order"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_purchaseId_key" ON "Order"("purchaseId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "ClickLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
