/*
  Warnings:

  - You are about to drop the column `views` on the `Level` table. All the data in the column will be lost.
  - You are about to drop the column `playedAt` on the `PlayHistory` table. All the data in the column will be lost.
  - You are about to drop the `Completion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,levelId]` on the table `PlayHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Completion" DROP CONSTRAINT "Completion_levelId_fkey";

-- DropForeignKey
ALTER TABLE "Completion" DROP CONSTRAINT "Completion_userId_fkey";

-- AlterTable
ALTER TABLE "Level" DROP COLUMN "views";

-- AlterTable
ALTER TABLE "PlayHistory" DROP COLUMN "playedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "lastPlayed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "Completion";

-- CreateIndex
CREATE UNIQUE INDEX "PlayHistory_userId_levelId_key" ON "PlayHistory"("userId", "levelId");
