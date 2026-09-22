-- CreateEnum
CREATE TYPE "WelcomeCallStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "welcome_calls" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "profileId" TEXT,
    "assignedToId" TEXT NOT NULL,
    "status" "WelcomeCallStatus" NOT NULL DEFAULT 'PENDING',
    "attachmentUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "welcome_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "welcome_calls_assignedToId_idx" ON "welcome_calls"("assignedToId");

-- CreateIndex
CREATE INDEX "welcome_calls_status_idx" ON "welcome_calls"("status");

-- AddForeignKey
ALTER TABLE "welcome_calls" ADD CONSTRAINT "welcome_calls_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_calls" ADD CONSTRAINT "welcome_calls_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_calls" ADD CONSTRAINT "welcome_calls_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
