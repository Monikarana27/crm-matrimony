-- CreateTable
CREATE TABLE "employee_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "note" TEXT,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_permissions_userId_idx" ON "employee_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_permissions_userId_permissionId_key" ON "employee_permissions"("userId", "permissionId");

-- AddForeignKey
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
