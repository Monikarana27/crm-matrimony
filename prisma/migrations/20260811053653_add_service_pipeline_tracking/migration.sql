-- CreateEnum
CREATE TYPE "ServiceStage" AS ENUM ('ACTIVE', 'ON_HOLD', 'MEETING_STAGE', 'FAMILY_DISCUSSION', 'MARRIAGE_FIXED', 'SUCCESS_CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HoldReason" AS ENUM ('FAMILY_DECISION_PENDING', 'ALREADY_TALKING_TO_SOMEONE', 'CAREER_FOCUS', 'TRAVEL', 'HEALTH', 'OTHER');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'PENDING');

-- CreateEnum
CREATE TYPE "SuccessType" AS ENUM ('ENGAGEMENT', 'MARRIAGE', 'SUCCESS_CLOSURE');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "holdAt" TIMESTAMP(3),
ADD COLUMN     "holdReason" "HoldReason",
ADD COLUMN     "serviceStage" "ServiceStage" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "profile_shares" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "sharedProfileId" TEXT NOT NULL,
    "sharedById" TEXT,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "shortlistedAt" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "profileShareId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "success_stories" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "SuccessType" NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_shares_subscriptionId_idx" ON "profile_shares"("subscriptionId");

-- CreateIndex
CREATE INDEX "profile_shares_sharedProfileId_idx" ON "profile_shares"("sharedProfileId");

-- CreateIndex
CREATE INDEX "interests_profileShareId_idx" ON "interests"("profileShareId");

-- CreateIndex
CREATE INDEX "success_stories_subscriptionId_idx" ON "success_stories"("subscriptionId");

-- AddForeignKey
ALTER TABLE "profile_shares" ADD CONSTRAINT "profile_shares_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_shares" ADD CONSTRAINT "profile_shares_sharedProfileId_fkey" FOREIGN KEY ("sharedProfileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_shares" ADD CONSTRAINT "profile_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_profileShareId_fkey" FOREIGN KEY ("profileShareId") REFERENCES "profile_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
