-- CreateEnum
CREATE TYPE "Department" AS ENUM ('SALES_EMP', 'PROFILE_EMP', 'SERVICE_EMP', 'HR_EMP');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" "Department";
