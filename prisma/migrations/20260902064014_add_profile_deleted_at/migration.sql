-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "profiles_deletedAt_idx" ON "profiles"("deletedAt");
