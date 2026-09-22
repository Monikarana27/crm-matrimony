-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CallOutcome" ADD VALUE 'WRONG_NUMBER';
ALTER TYPE "CallOutcome" ADD VALUE 'INTERESTED';
ALTER TYPE "CallOutcome" ADD VALUE 'CALLBACK';

-- AlterTable
ALTER TABLE "call_logs" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "recordingUrl" TEXT;

-- CreateIndex
CREATE INDEX "call_logs_createdById_idx" ON "call_logs"("createdById");

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
