-- CreateEnum
CREATE TYPE "ImportQueueStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: add importQueueItems relation (no column needed on Character side)

-- CreateTable
CREATE TABLE "ImportQueueItem" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER,
    "characterName" TEXT NOT NULL,
    "incomingData" JSONB NOT NULL,
    "existingData" JSONB,
    "status" "ImportQueueStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportQueueItem_characterId_status_key" ON "ImportQueueItem"("characterId", "status");

-- AddForeignKey
ALTER TABLE "ImportQueueItem" ADD CONSTRAINT "ImportQueueItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
