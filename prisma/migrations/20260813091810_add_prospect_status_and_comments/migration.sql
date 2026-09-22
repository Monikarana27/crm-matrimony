-- AlterTable
ALTER TABLE "profile_shares" ADD COLUMN     "prospectStatus" "InterestStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "profile_share_comments" (
    "id" TEXT NOT NULL,
    "profileShareId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_share_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_share_comments_profileShareId_idx" ON "profile_share_comments"("profileShareId");

-- AddForeignKey
ALTER TABLE "profile_share_comments" ADD CONSTRAINT "profile_share_comments_profileShareId_fkey" FOREIGN KEY ("profileShareId") REFERENCES "profile_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_share_comments" ADD CONSTRAINT "profile_share_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
