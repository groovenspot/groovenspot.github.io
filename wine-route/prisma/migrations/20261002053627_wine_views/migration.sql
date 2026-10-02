-- CreateTable
CREATE TABLE "WineView" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "anonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WineView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WineView_createdAt_idx" ON "WineView"("createdAt");

-- AddForeignKey
ALTER TABLE "WineView" ADD CONSTRAINT "WineView_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
