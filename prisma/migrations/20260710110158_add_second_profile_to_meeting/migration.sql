-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "profileTwoId" TEXT;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_profileTwoId_fkey" FOREIGN KEY ("profileTwoId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
