-- CreateTable
CREATE TABLE "profile_remarks" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_remarks_profileId_idx" ON "profile_remarks"("profileId");

-- AddForeignKey
ALTER TABLE "profile_remarks" ADD CONSTRAINT "profile_remarks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_remarks" ADD CONSTRAINT "profile_remarks_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
