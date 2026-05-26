/*
  Warnings:

  - You are about to drop the column `completed` on the `Level` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Level" DROP COLUMN "completed",
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'medium';

-- CreateTable
CREATE TABLE "Completion" (
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("userId","levelId")
);

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
