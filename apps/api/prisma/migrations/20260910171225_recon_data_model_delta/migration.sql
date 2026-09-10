/*
  Warnings:

  - You are about to drop the column `avgImpressions` on the `CreatorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerPostCents` on the `CreatorProfile` table. All the data in the column will be lost.
  - Added the required column `bundle5PriceCents` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medianViews` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `observedEngagerCount` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postCostCents` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postsAnalyzed` to the `CreatorProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Network" AS ENUM ('LINKEDIN', 'X');

-- CreateEnum
CREATE TYPE "BookingInitiator" AS ENUM ('BRAND', 'CREATOR');

-- CreateEnum
CREATE TYPE "AudienceDimension" AS ENUM ('JOB_TITLE', 'SENIORITY', 'INDUSTRY', 'GEOGRAPHY');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "initiatedBy" "BookingInitiator" NOT NULL DEFAULT 'BRAND';

-- AlterTable
ALTER TABLE "CreatorProfile" DROP COLUMN "avgImpressions",
DROP COLUMN "pricePerPostCents",
ADD COLUMN     "bundle5PriceCents" INTEGER NOT NULL,
ADD COLUMN     "medianViews" INTEGER NOT NULL,
ADD COLUMN     "network" "Network" NOT NULL DEFAULT 'LINKEDIN',
ADD COLUMN     "observedEngagerCount" INTEGER NOT NULL,
ADD COLUMN     "postCostCents" INTEGER NOT NULL,
ADD COLUMN     "postsAnalyzed" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AudienceSegment" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "dimension" "AudienceDimension" NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPost" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL,
    "reactions" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "reposts" INTEGER NOT NULL,
    "externalUrl" TEXT NOT NULL,

    CONSTRAINT "CreatorPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Icp" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Icp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudienceSegment_creatorProfileId_idx" ON "AudienceSegment"("creatorProfileId");

-- CreateIndex
CREATE INDEX "AudienceSegment_creatorProfileId_dimension_idx" ON "AudienceSegment"("creatorProfileId", "dimension");

-- CreateIndex
CREATE INDEX "CreatorPost_creatorProfileId_idx" ON "CreatorPost"("creatorProfileId");

-- CreateIndex
CREATE INDEX "CreatorPost_publishedAt_idx" ON "CreatorPost"("publishedAt");

-- CreateIndex
CREATE INDEX "Icp_campaignId_idx" ON "Icp"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Icp_campaignId_rank_key" ON "Icp"("campaignId", "rank");

-- CreateIndex
CREATE INDEX "CreatorProfile_network_idx" ON "CreatorProfile"("network");

-- AddForeignKey
ALTER TABLE "AudienceSegment" ADD CONSTRAINT "AudienceSegment_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPost" ADD CONSTRAINT "CreatorPost_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Icp" ADD CONSTRAINT "Icp_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
