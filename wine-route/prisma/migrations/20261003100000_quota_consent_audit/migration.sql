-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsentNoticeAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ScanQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "detail" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanQuota_createdAt_idx" ON "ScanQuota"("createdAt");

-- CreateIndex
CREATE INDEX "ScanQuota_userId_createdAt_idx" ON "ScanQuota"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanQuota_ipHash_createdAt_idx" ON "ScanQuota"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_action_createdAt_idx" ON "AdminLog"("action", "createdAt");

