-- CreateEnum
CREATE TYPE "MeetingOutcome" AS ENUM ('PENDING', 'POSITIVE', 'NEGATIVE', 'ONE_SIDED', 'FOLLOW_UP_NEEDED');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "outcome" "MeetingOutcome" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reminderAt" TIMESTAMP(3);
