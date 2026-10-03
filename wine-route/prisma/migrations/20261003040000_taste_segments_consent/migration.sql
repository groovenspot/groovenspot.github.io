-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsentUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TasteProfile" (
    "userId" TEXT NOT NULL,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasteProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "TasteProfile" ADD CONSTRAINT "TasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
