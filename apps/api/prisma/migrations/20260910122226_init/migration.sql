-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COMPANY', 'CREATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('SALES', 'REVOPS', 'DEVTOOLS', 'HR_TECH', 'PRODUCT', 'MARKETING_OPS', 'FINTECH', 'VERTICAL_SAAS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'DRAFT_READY', 'SCHEDULED', 'LIVE', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "vertical" "Vertical" NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "pricePerPostCents" INTEGER NOT NULL,
    "avgImpressions" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,
    "audienceFitScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "keyMessages" TEXT NOT NULL,
    "guidelines" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "agreedPriceCents" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'INVITED',
    "deliverable" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "trackedLinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorProfile_vertical_idx" ON "CreatorProfile"("vertical");

-- CreateIndex
CREATE INDEX "CreatorProfile_country_idx" ON "CreatorProfile"("country");

-- CreateIndex
CREATE INDEX "Campaign_companyId_idx" ON "Campaign"("companyId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Booking_campaignId_idx" ON "Booking"("campaignId");

-- CreateIndex
CREATE INDEX "Booking_creatorProfileId_idx" ON "Booking"("creatorProfileId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Post_bookingId_key" ON "Post"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_bookingId_key" ON "TrackedLink"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_slug_key" ON "TrackedLink"("slug");

-- CreateIndex
CREATE INDEX "TrackedLink_slug_idx" ON "TrackedLink"("slug");

-- CreateIndex
CREATE INDEX "ClickEvent_trackedLinkId_idx" ON "ClickEvent"("trackedLinkId");

-- CreateIndex
CREATE INDEX "ClickEvent_createdAt_idx" ON "ClickEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_bookingId_key" ON "Payout"("bookingId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "TrackedLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
