-- DropIndex
DROP INDEX "Chat_userId_idx";

-- CreateIndex
CREATE INDEX "Chat_userId_updatedAt_id_idx" ON "Chat"("userId", "updatedAt", "id");
