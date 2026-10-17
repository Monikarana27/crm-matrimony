
CREATE EXTENSION IF NOT EXISTS vector;
-- CreateEnum
CREATE TYPE "PPValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "FeedbackPartyType" AS ENUM ('PROSPECT', 'CLIENT');

-- CreateEnum
CREATE TYPE "WelcomeCallLogStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "SmeCallStatus" AS ENUM ('NOT_PICKED', 'BUSY', 'SWITCHED_OFF', 'CALL_BACK_LATER', 'WRONG_NUMBER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED');

-- AlterEnum
ALTER TYPE "InterestStatus" ADD VALUE 'HOLD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'MEMBER_BUSY';
ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP';
ALTER TYPE "LeadStatus" ADD VALUE 'NOT_REACHABLE';
ALTER TYPE "LeadStatus" ADD VALUE 'OPT_WITH_COMPETITORS';
ALTER TYPE "LeadStatus" ADD VALUE 'NO_NOT_EXIST';
ALTER TYPE "LeadStatus" ADD VALUE 'WRONG_NUMBER_FAKE_LEAD';
ALTER TYPE "LeadStatus" ADD VALUE 'PTP';
ALTER TYPE "LeadStatus" ADD VALUE 'PRODUCT_PITCH';
ALTER TYPE "LeadStatus" ADD VALUE 'MARRIAGE_FIXED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeetingType" ADD VALUE 'VC';
ALTER TYPE "MeetingType" ADD VALUE 'SUCCESS_STORY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SME_FOLLOWUP';
ALTER TYPE "NotificationType" ADD VALUE 'SME_FOLLOWUP_DONE';
ALTER TYPE "NotificationType" ADD VALUE 'LEAD_REASSIGNED_STALE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SME';
ALTER TYPE "Role" ADD VALUE 'SYSTEM';

-- AlterEnum
ALTER TYPE "ServiceStage" ADD VALUE 'STOPPED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'STOPPED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'REFUNDED';

-- DropForeignKey
ALTER TABLE "welcome_calls" DROP CONSTRAINT "welcome_calls_assignedToId_fkey";

-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "breakEnd" TIMESTAMP(3),
ADD COLUMN     "breakStart" TIMESTAMP(3),
ADD COLUMN     "resumedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lead_assignment_history" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "lead_remarks" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "status" "LeadStatus";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT;

-- AlterTable
ALTER TABLE "partner_preferences" ADD COLUMN     "annualIncomeCurrency" TEXT,
ADD COLUMN     "annualIncomeRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "casteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cityMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "countryMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dietMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "drinkingMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasChildrenOkMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "manglikStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maritalStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "motherTongueIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "professionMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualificationMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "religionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "smokingMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stateMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visaStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "amountInr" DOUBLE PRECISION,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "soldById" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "profile_shares" ADD COLUMN     "clientFeedback" TEXT,
ADD COLUMN     "clientStatus" "InterestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "emailStatus" TEXT,
ADD COLUMN     "prospectFeedback" TEXT,
ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "annualIncomeCurrency" TEXT,
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "embedding" vector(768),
ADD COLUMN     "familyAnnualIncomeCurrency" TEXT,
ADD COLUMN     "familyNetWorth" TEXT,
ADD COLUMN     "familyNetWorthCurrency" TEXT,
ADD COLUMN     "nakshatra" TEXT,
ADD COLUMN     "rashi" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pauseDays" INTEGER,
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedById" TEXT,
ADD COLUMN     "totalPausedDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSME" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "websiteLeadsLastViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "welcome_calls" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "sentVia" TEXT,
ALTER COLUMN "assignedToId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "pp_validation_requests" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientGender" "Gender",
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientLocation" TEXT,
    "packageDetails" TEXT,
    "amount" TEXT,
    "paymentMode" TEXT,
    "leadId" TEXT,
    "profileId" TEXT,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minHeight" TEXT,
    "maxHeight" TEXT,
    "maritalStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motherTongueIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "religionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "casteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manglikStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasChildrenOkMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stateMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cityMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualificationMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "professionMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "annualIncomeCurrency" TEXT,
    "annualIncomeRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "drinkingMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smokingMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visaStatusMulti" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aboutDesiredPartner" TEXT,
    "notes" TEXT,
    "status" "PPValidationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "assignedEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pp_validation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pp_validation_reviews" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "PPValidationStatus" NOT NULL,
    "matchesFound" INTEGER,
    "matchedProfileCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pp_validation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_stage_history" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "stage" "ServiceStage" NOT NULL,
    "remarks" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_comments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sme_follow_ups" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "ppRequestId" TEXT,
    "createdById" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sme_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sme_client_reviews" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sme_client_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_assignment_history" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT,
    "unassignedReason" TEXT,
    "note" TEXT,

    CONSTRAINT "profile_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_assignment_remarks" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "remark" TEXT,
    "followUpDate" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_assignment_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_share_feedback_history" (
    "id" TEXT NOT NULL,
    "profileShareId" TEXT NOT NULL,
    "type" "FeedbackPartyType" NOT NULL,
    "status" "InterestStatus",
    "feedback" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_share_feedback_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "welcome_call_logs" (
    "id" TEXT NOT NULL,
    "welcomeCallId" TEXT NOT NULL,
    "status" "WelcomeCallLogStatus" NOT NULL,
    "nextCallTime" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "welcome_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_record_logs" (
    "id" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "deletedById" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_record_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_assignment_audit_log" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "employeeId" TEXT,
    "oldEmployeeId" INTEGER,
    "updatedById" TEXT,
    "oldUpdatedBy" BIGINT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_assignment_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_events" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "isRepeat" BOOLEAN NOT NULL DEFAULT false,
    "pagePath" TEXT,
    "landingPath" TEXT,
    "referrer" TEXT,
    "referrerHost" TEXT,
    "channel" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "hasClickId" BOOLEAN NOT NULL DEFAULT false,
    "device" TEXT,
    "pagesViewed" INTEGER,

    CONSTRAINT "enquiry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stale_reassignment_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "candidates" INTEGER NOT NULL DEFAULT 0,
    "staleFound" INTEGER NOT NULL DEFAULT 0,
    "reassigned" INTEGER NOT NULL DEFAULT 0,
    "skippedSame" INTEGER NOT NULL DEFAULT 0,
    "notProcessed" INTEGER NOT NULL DEFAULT 0,
    "stoppedAtCap" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "stale_reassignment_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stale_reassignment_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadStatus" TEXT NOT NULL,
    "idleDays" INTEGER NOT NULL,
    "fromEmployeeId" TEXT,
    "toEmployeeId" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stale_reassignment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sme_client_call_attempts" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "status" "SmeCallStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sme_client_call_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION,
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "processNote" TEXT,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pp_validation_requests_profileId_key" ON "pp_validation_requests"("profileId");

-- CreateIndex
CREATE INDEX "pp_validation_requests_status_idx" ON "pp_validation_requests"("status");

-- CreateIndex
CREATE INDEX "pp_validation_requests_submittedById_idx" ON "pp_validation_requests"("submittedById");

-- CreateIndex
CREATE INDEX "pp_validation_reviews_requestId_idx" ON "pp_validation_reviews"("requestId");

-- CreateIndex
CREATE INDEX "service_stage_history_subscriptionId_idx" ON "service_stage_history"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_comments_subscriptionId_idx" ON "subscription_comments"("subscriptionId");

-- CreateIndex
CREATE INDEX "sme_follow_ups_employeeId_idx" ON "sme_follow_ups"("employeeId");

-- CreateIndex
CREATE INDEX "sme_follow_ups_clientProfileId_idx" ON "sme_follow_ups"("clientProfileId");

-- CreateIndex
CREATE INDEX "sme_follow_ups_ppRequestId_idx" ON "sme_follow_ups"("ppRequestId");

-- CreateIndex
CREATE INDEX "sme_client_reviews_subscriptionId_createdAt_idx" ON "sme_client_reviews"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "sme_client_reviews_employeeId_createdAt_idx" ON "sme_client_reviews"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "employee_documents_userId_idx" ON "employee_documents"("userId");

-- CreateIndex
CREATE INDEX "profile_assignment_history_profileId_idx" ON "profile_assignment_history"("profileId");

-- CreateIndex
CREATE INDEX "profile_assignment_history_employeeId_idx" ON "profile_assignment_history"("employeeId");

-- CreateIndex
CREATE INDEX "profile_assignment_remarks_assignmentId_idx" ON "profile_assignment_remarks"("assignmentId");

-- CreateIndex
CREATE INDEX "profile_share_feedback_history_profileShareId_idx" ON "profile_share_feedback_history"("profileShareId");

-- CreateIndex
CREATE INDEX "welcome_call_logs_welcomeCallId_idx" ON "welcome_call_logs"("welcomeCallId");

-- CreateIndex
CREATE INDEX "deleted_record_logs_modelType_idx" ON "deleted_record_logs"("modelType");

-- CreateIndex
CREATE INDEX "deleted_record_logs_recordId_idx" ON "deleted_record_logs"("recordId");

-- CreateIndex
CREATE INDEX "profile_assignment_audit_log_profileId_idx" ON "profile_assignment_audit_log"("profileId");

-- CreateIndex
CREATE INDEX "enquiry_events_createdAt_idx" ON "enquiry_events"("createdAt");

-- CreateIndex
CREATE INDEX "enquiry_events_leadId_idx" ON "enquiry_events"("leadId");

-- CreateIndex
CREATE INDEX "stale_reassignment_items_runId_idx" ON "stale_reassignment_items"("runId");

-- CreateIndex
CREATE INDEX "stale_reassignment_items_leadId_idx" ON "stale_reassignment_items"("leadId");

-- CreateIndex
CREATE INDEX "sme_client_call_attempts_subscriptionId_createdAt_idx" ON "sme_client_call_attempts"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_subscriptionId_idx" ON "refunds"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_paymentId_key" ON "achievements"("paymentId");

-- CreateIndex
CREATE INDEX "leads_deletedAt_idx" ON "leads"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "profile_shares_shareToken_key" ON "profile_shares"("shareToken");

-- AddForeignKey
ALTER TABLE "pp_validation_requests" ADD CONSTRAINT "pp_validation_requests_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pp_validation_requests" ADD CONSTRAINT "pp_validation_requests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pp_validation_requests" ADD CONSTRAINT "pp_validation_requests_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pp_validation_requests" ADD CONSTRAINT "pp_validation_requests_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pp_validation_reviews" ADD CONSTRAINT "pp_validation_reviews_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "pp_validation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pp_validation_reviews" ADD CONSTRAINT "pp_validation_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_stage_history" ADD CONSTRAINT "service_stage_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_comments" ADD CONSTRAINT "subscription_comments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_comments" ADD CONSTRAINT "subscription_comments_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_follow_ups" ADD CONSTRAINT "sme_follow_ups_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_follow_ups" ADD CONSTRAINT "sme_follow_ups_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_follow_ups" ADD CONSTRAINT "sme_follow_ups_ppRequestId_fkey" FOREIGN KEY ("ppRequestId") REFERENCES "pp_validation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_follow_ups" ADD CONSTRAINT "sme_follow_ups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_follow_ups" ADD CONSTRAINT "sme_follow_ups_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_client_reviews" ADD CONSTRAINT "sme_client_reviews_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_client_reviews" ADD CONSTRAINT "sme_client_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sme_client_reviews" ADD CONSTRAINT "sme_client_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_history" ADD CONSTRAINT "profile_assignment_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_history" ADD CONSTRAINT "profile_assignment_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_history" ADD CONSTRAINT "profile_assignment_history_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_remarks" ADD CONSTRAINT "profile_assignment_remarks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "profile_assignment_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_share_feedback_history" ADD CONSTRAINT "profile_share_feedback_history_profileShareId_fkey" FOREIGN KEY ("profileShareId") REFERENCES "profile_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_share_feedback_history" ADD CONSTRAINT "profile_share_feedback_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_calls" ADD CONSTRAINT "welcome_calls_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_call_logs" ADD CONSTRAINT "welcome_call_logs_welcomeCallId_fkey" FOREIGN KEY ("welcomeCallId") REFERENCES "welcome_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_call_logs" ADD CONSTRAINT "welcome_call_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_audit_log" ADD CONSTRAINT "profile_assignment_audit_log_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_audit_log" ADD CONSTRAINT "profile_assignment_audit_log_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment_audit_log" ADD CONSTRAINT "profile_assignment_audit_log_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stale_reassignment_items" ADD CONSTRAINT "stale_reassignment_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "stale_reassignment_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

