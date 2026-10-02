-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TARGET', 'DROP', 'RESTOCK', 'VINTAGE', 'ALLOCATION', 'FX', 'DIGEST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hitWatchLimitAt" TIMESTAMP(3),
ADD COLUMN     "refCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "WatchPrice" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "bottleMl" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "perBottle" INTEGER,
    "route" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "wineId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "channel" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "dedupeKey" TEXT NOT NULL,
    "digestId" TEXT,
    "sentAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationOpen" (
    "id" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonId" TEXT,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "wineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefVisit" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "anonId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "UserDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "extracted" JSONB NOT NULL,
    "topWineId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chosenWineId" TEXT,
    "correct" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WineRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "scanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WineRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchPrice_wineId_qty_bottleMl_day_key" ON "WatchPrice"("wineId", "qty", "bottleMl", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_type_idx" ON "Notification"("status", "type");

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RefVisit_refCode_createdAt_idx" ON "RefVisit"("refCode", "createdAt");

-- CreateIndex
CREATE INDEX "ScanLog_createdAt_idx" ON "ScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "WineRequest_status_createdAt_idx" ON "WineRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_refCode_key" ON "User"("refCode");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDay" ADD CONSTRAINT "UserDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

