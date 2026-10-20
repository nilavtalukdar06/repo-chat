-- Chats created before repository scoping have no repository and are removed
DELETE FROM "Chat";

-- DropIndex
DROP INDEX "Chat_userId_updatedAt_id_idx";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "repositoryId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Chat_userId_repositoryId_updatedAt_id_idx" ON "Chat"("userId", "repositoryId", "updatedAt", "id");
