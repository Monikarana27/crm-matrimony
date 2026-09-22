-- CreateEnum
CREATE TYPE "WorkspaceAttachmentType" AS ENUM ('LEAD', 'PROFILE', 'MEETING', 'PAYMENT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'REPLY', 'IMPORTANT_ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "workspace_messages" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "WorkspaceAttachmentType" NOT NULL,
    "recordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "messageId" TEXT,
    "actorId" TEXT,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_messages_parentId_idx" ON "workspace_messages"("parentId");

-- CreateIndex
CREATE INDEX "workspace_messages_isImportant_idx" ON "workspace_messages"("isImportant");

-- CreateIndex
CREATE INDEX "workspace_mentions_mentionedUserId_idx" ON "workspace_mentions"("mentionedUserId");

-- CreateIndex
CREATE INDEX "workspace_attachments_messageId_idx" ON "workspace_attachments"("messageId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_read_idx" ON "notifications"("recipientId", "read");

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_mentions" ADD CONSTRAINT "workspace_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_mentions" ADD CONSTRAINT "workspace_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "workspace_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
