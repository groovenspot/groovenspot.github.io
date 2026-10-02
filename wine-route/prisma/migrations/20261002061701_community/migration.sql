-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adultVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "ciHash" TEXT,
ADD COLUMN     "founding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "premiumUntil" TIMESTAMP(3);

-- DropTable
DROP TABLE "Review";

-- CreateTable
CREATE TABLE "DirectReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "sellerId" TEXT,
    "orderId" TEXT,
    "route" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "bottleMl" INTEGER NOT NULL DEFAULT 750,
    "taxPaid" INTEGER NOT NULL,
    "estTax" INTEGER,
    "cardPaidKrw" INTEGER,
    "shippingDays" INTEGER NOT NULL,
    "damaged" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "proofStatus" "ProofStatus" NOT NULL DEFAULT 'NONE',
    "proofNote" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofFile" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Helpful" (
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Helpful_pkey" PRIMARY KEY ("reviewId","userId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTx" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "code" TEXT NOT NULL,
    "note" TEXT,
    "premiumMonths" INTEGER NOT NULL DEFAULT 6,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectReview_orderId_key" ON "DirectReview"("orderId");

-- CreateIndex
CREATE INDEX "DirectReview_status_createdAt_idx" ON "DirectReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DirectReview_wineId_idx" ON "DirectReview"("wineId");

-- CreateIndex
CREATE INDEX "DirectReview_sellerId_idx" ON "DirectReview"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofFile_reviewId_key" ON "ProofFile"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reviewId_userId_key" ON "Report"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "PointTx_userId_createdAt_idx" ON "PointTx"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointTx_userId_reason_refId_key" ON "PointTx"("userId", "reason", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_ciHash_key" ON "User"("ciHash");

-- AddForeignKey
ALTER TABLE "DirectReview" ADD CONSTRAINT "DirectReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectReview" ADD CONSTRAINT "DirectReview_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectReview" ADD CONSTRAINT "DirectReview_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectReview" ADD CONSTRAINT "DirectReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofFile" ADD CONSTRAINT "ProofFile_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DirectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpful" ADD CONSTRAINT "Helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DirectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpful" ADD CONSTRAINT "Helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DirectReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTx" ADD CONSTRAINT "PointTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

