-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SALES_TL';
ALTER TYPE "Role" ADD VALUE 'SALES_MANAGER';
ALTER TYPE "Role" ADD VALUE 'SERVICE_TL';
ALTER TYPE "Role" ADD VALUE 'SERVICE_MANAGER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "managerId" TEXT;

-- CreateIndex
CREATE INDEX "users_managerId_idx" ON "users"("managerId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
