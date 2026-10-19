-- CreateEnum
CREATE TYPE "Status" AS ENUM ('QUEUED', 'INDEXING', 'INDEXED', 'FAILED');

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stars" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'QUEUED',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repository_userId_createdAt_idx" ON "Repository"("userId", "createdAt");
