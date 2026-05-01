-- Step 1: Create the CharacterPower junction table.
CREATE TABLE "CharacterPower" (
    "id"          SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "powerId"     INTEGER NOT NULL,
    "modifier"    INTEGER NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterPower_pkey" PRIMARY KEY ("id")
);

-- Step 2: Unique index — one assignment per (character, power).
CREATE UNIQUE INDEX "CharacterPower_characterId_powerId_key"
    ON "CharacterPower"("characterId", "powerId");

-- Step 3: Foreign-key constraints for CharacterPower.
ALTER TABLE "CharacterPower"
    ADD CONSTRAINT "CharacterPower_characterId_fkey"
        FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CharacterPower"
    ADD CONSTRAINT "CharacterPower_powerId_fkey"
        FOREIGN KEY ("powerId") REFERENCES "Power"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Rename ability → baseAbility and skillPercentage → basePercentage on Power.
ALTER TABLE "Power" RENAME COLUMN "ability" TO "baseAbility";
ALTER TABLE "Power" RENAME COLUMN "skillPercentage" TO "basePercentage";

-- Step 5: Migrate existing Power rows into CharacterPower (modifier = 0).
INSERT INTO "CharacterPower" ("characterId", "powerId", "modifier", "createdAt", "updatedAt")
SELECT "personId", "id", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Power"
WHERE "personId" IS NOT NULL;

-- Step 6: Drop the old FK constraint and column on Power.
ALTER TABLE "Power" DROP CONSTRAINT IF EXISTS "Power_personId_fkey";
ALTER TABLE "Power" DROP COLUMN IF EXISTS "personId";

-- Step 7: Add unique constraint to Power.name.
CREATE UNIQUE INDEX "Power_name_key" ON "Power"("name");
