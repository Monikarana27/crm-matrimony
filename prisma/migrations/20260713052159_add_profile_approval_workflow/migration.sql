-- CreateEnum
CREATE TYPE "LeadCallOutcome" AS ENUM ('INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'DNP');

-- CreateEnum
CREATE TYPE "ProfileQueueStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PHOTO', 'ID_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'NEEDS_CHANGES');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "approvalNotes" TEXT,
ADD COLUMN     "approvalStatus" "ProfileApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL';

-- CreateTable
CREATE TABLE "lead_remarks" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "outcome" "LeadCallOutcome" NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_queue" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "ProfileQueueStatus" NOT NULL DEFAULT 'PENDING',
    "createdProfileId" TEXT,
    "sentToQueueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT,

    CONSTRAINT "profile_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_documents" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_remarks_leadId_idx" ON "lead_remarks"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_queue_leadId_key" ON "profile_queue"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_queue_createdProfileId_key" ON "profile_queue"("createdProfileId");

-- CreateIndex
CREATE INDEX "profile_queue_status_idx" ON "profile_queue"("status");

-- CreateIndex
CREATE INDEX "profile_documents_profileId_idx" ON "profile_documents"("profileId");

-- AddForeignKey
ALTER TABLE "lead_remarks" ADD CONSTRAINT "lead_remarks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_remarks" ADD CONSTRAINT "lead_remarks_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_queue" ADD CONSTRAINT "profile_queue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_queue" ADD CONSTRAINT "profile_queue_createdProfileId_fkey" FOREIGN KEY ("createdProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
