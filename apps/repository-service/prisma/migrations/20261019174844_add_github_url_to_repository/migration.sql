/*
  Warnings:

  - Added the required column `githubUrl` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "githubUrl" TEXT NOT NULL;
