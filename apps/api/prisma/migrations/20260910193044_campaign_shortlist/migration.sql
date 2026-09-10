-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShortlistItem_campaignId_idx" ON "ShortlistItem"("campaignId");

-- CreateIndex
CREATE INDEX "ShortlistItem_creatorProfileId_idx" ON "ShortlistItem"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_campaignId_creatorProfileId_key" ON "ShortlistItem"("campaignId", "creatorProfileId");

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
