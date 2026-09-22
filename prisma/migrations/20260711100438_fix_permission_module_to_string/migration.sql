/*
  Warnings:

  - Changed the type of `module` on the `permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "module",
ADD COLUMN     "module" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PermissionModule";

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");
