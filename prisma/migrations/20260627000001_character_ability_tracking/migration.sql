-- ─── CharacterAbility table ───────────────────────────────────────────────────

CREATE TABLE "CharacterAbility" (
    "id"                     SERIAL NOT NULL,
    "characterId"            INTEGER NOT NULL,
    "name"                   TEXT NOT NULL,
    "currentValue"           INTEGER NOT NULL,
    "markedForImprovement"   BOOLEAN NOT NULL DEFAULT false,
    "sourceCharacterPowerId" INTEGER,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAbility_pkey" PRIMARY KEY ("id")
);

-- One ability per name per character
CREATE UNIQUE INDEX "CharacterAbility_characterId_name_key"
    ON "CharacterAbility"("characterId", "name");

-- A CharacterPower can link to at most one CharacterAbility
CREATE UNIQUE INDEX "CharacterAbility_sourceCharacterPowerId_key"
    ON "CharacterAbility"("sourceCharacterPowerId")
    WHERE "sourceCharacterPowerId" IS NOT NULL;

ALTER TABLE "CharacterAbility"
    ADD CONSTRAINT "CharacterAbility_characterId_fkey"
        FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CharacterAbility"
    ADD CONSTRAINT "CharacterAbility_sourceCharacterPowerId_fkey"
        FOREIGN KEY ("sourceCharacterPowerId") REFERENCES "CharacterPower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── abilityId on RollHistory ─────────────────────────────────────────────────

ALTER TABLE "RollHistory" ADD COLUMN "abilityId" INTEGER;

ALTER TABLE "RollHistory"
    ADD CONSTRAINT "RollHistory_abilityId_fkey"
        FOREIGN KEY ("abilityId") REFERENCES "CharacterAbility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Backfill from power-synced CharacterSkillValues ─────────────────────────
-- Skills with category='Powers' were created automatically by the old
-- syncCharacterPowerSkill mechanism.  Migrate them into CharacterAbility,
-- preserving the currentValue and markedForImprovement state, and link them
-- back to their originating CharacterPower where possible.

INSERT INTO "CharacterAbility"
    ("characterId", "name", "currentValue", "markedForImprovement",
     "sourceCharacterPowerId", "createdAt", "updatedAt")
SELECT
    cs."characterId",
    s."name"                         AS "name",
    COALESCE(csv."value", s."baseValue") AS "currentValue",
    csv."markedForImprovement"       AS "markedForImprovement",
    cp."id"                          AS "sourceCharacterPowerId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CharacterSkillValue" csv
JOIN "CharacterSheet"  cs  ON cs."id"  = csv."sheetId"
JOIN "Skill"           s   ON s."id"   = csv."skillId"
-- Try to find the matching CharacterPower (power with same baseAbility on same character)
LEFT JOIN "CharacterPower" cp
    ON  cp."characterId" = cs."characterId"
    AND cp."powerId" IN (
        SELECT "id" FROM "Power" WHERE "baseAbility" = s."name"
    )
WHERE s."category" = 'Powers'
ON CONFLICT ("characterId", "name") DO NOTHING;

-- ─── Clean up power-synced CharacterSkillValues ───────────────────────────────
-- Remove CharacterSkillValue rows that have been migrated into CharacterAbility.

DELETE FROM "CharacterSkillValue"
WHERE "skillId" IN (SELECT "id" FROM "Skill" WHERE "category" = 'Powers')
  AND EXISTS (
      SELECT 1
      FROM "CharacterAbility" ca
      JOIN "CharacterSheet" cs ON cs."characterId" = ca."characterId"
      WHERE cs."id" = "CharacterSkillValue"."sheetId"
        AND ca."name" = (SELECT "name" FROM "Skill" WHERE "id" = "CharacterSkillValue"."skillId")
  );

-- ─── Remove orphaned Power-category Skill definitions ────────────────────────
-- Only delete Skills with category='Powers' that are no longer referenced by
-- any CharacterSkillValue (all were migrated above).

DELETE FROM "Skill"
WHERE "category" = 'Powers'
  AND NOT EXISTS (
      SELECT 1 FROM "CharacterSkillValue" csv WHERE csv."skillId" = "Skill"."id"
  );
