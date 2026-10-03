-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('INTERNATIONAL', 'KOREA_ARRIVAL', 'CUSTOMS', 'TAX_NOTICE', 'DOMESTIC', 'DELIVERED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "actualTax" INTEGER,
ADD COLUMN     "customsNo" TEXT,
ADD COLUMN     "customsYear" INTEGER,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "domesticCarrier" TEXT,
ADD COLUMN     "domesticTrackingNo" TEXT,
ADD COLUMN     "estimatedDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "shipmentStage" "ShipmentStage",
ADD COLUMN     "taxNoticeAt" TIMESTAMP(3),
ADD COLUMN     "trackingError" TEXT,
ADD COLUMN     "trackingRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "trackingSyncedAt" TIMESTAMP(3),
ADD COLUMN     "trackingUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FirstPurchaseGuide" (
    "userId" TEXT NOT NULL,
    "pcccIssued" BOOLEAN NOT NULL DEFAULT false,
    "cardChecked" BOOLEAN NOT NULL DEFAULT false,
    "addressConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "preparedRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FirstPurchaseGuide_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stage" "ShipmentStage" NOT NULL,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "location" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentEvent_orderId_occurredAt_idx" ON "ShipmentEvent"("orderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentEvent_orderId_externalId_key" ON "ShipmentEvent"("orderId", "externalId");

-- AddForeignKey
ALTER TABLE "FirstPurchaseGuide" ADD CONSTRAINT "FirstPurchaseGuide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 기존 운송장을 신규 추적 기능으로 가져옵니다. 미확인 배송 단계는 생성하지 않습니다.
UPDATE "Order" SET "trackingRegisteredAt" = CURRENT_TIMESTAMP WHERE "trackingNo" IS NOT NULL AND length(trim("trackingNo")) > 0;
UPDATE "Order" o SET "actualTax" = p."taxPaid" FROM "Purchase" p WHERE o."purchaseId" = p.id;
UPDATE "Order" o SET "deliveredAt" = e.at FROM (SELECT "orderId", MIN("createdAt") AS at FROM "OrderEvent" WHERE status = 'DELIVERED' GROUP BY "orderId") e WHERE o.id = e."orderId" AND o.status = 'DELIVERED';
UPDATE "Order" SET "shipmentStage" = CASE status WHEN 'SHIPPED' THEN 'INTERNATIONAL'::"ShipmentStage" WHEN 'CUSTOMS' THEN 'CUSTOMS'::"ShipmentStage" WHEN 'DELIVERED' THEN 'DELIVERED'::"ShipmentStage" END WHERE status IN ('SHIPPED', 'CUSTOMS', 'DELIVERED');
INSERT INTO "ShipmentEvent" (id, "orderId", stage, source, "occurredAt", note, "externalId")
SELECT 'legacy-' || id, "orderId", CASE status WHEN 'SHIPPED' THEN 'INTERNATIONAL'::"ShipmentStage" WHEN 'CUSTOMS' THEN 'CUSTOMS'::"ShipmentStage" WHEN 'DELIVERED' THEN 'DELIVERED'::"ShipmentStage" END, by, "createdAt", note, 'legacy-' || id
FROM "OrderEvent" WHERE status IN ('SHIPPED', 'CUSTOMS', 'DELIVERED');
