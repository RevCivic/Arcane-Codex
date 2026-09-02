-- CreateTable SheetLayoutPreference
CREATE TABLE "SheetLayoutPreference" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "userEmail" TEXT,
    "characterId" INTEGER,
    "hiddenModules" JSONB NOT NULL DEFAULT '[]',
    "moduleOrder" JSONB NOT NULL DEFAULT '[]',
    "moduleSizes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SheetLayoutPreference_userEmail_characterId_key" UNIQUE("userEmail", "characterId"),
    CONSTRAINT "SheetLayoutPreference_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "AllowedEmail"("email") ON DELETE CASCADE,
    CONSTRAINT "SheetLayoutPreference_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE
);
