-- CreateTable
CREATE TABLE "RollHistory" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "rollType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "roll" INTEGER NOT NULL,
    "target" INTEGER,
    "difficulty" TEXT,
    "resultType" TEXT,
    "dice" TEXT,
    "modifier" INTEGER,
    "luckSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RollHistory" ADD CONSTRAINT "RollHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
