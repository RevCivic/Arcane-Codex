-- AlterTable: add claimedByEmail to Character
ALTER TABLE "Character" ADD COLUMN "claimedByEmail" TEXT;

-- CreateIndex: unique constraint on claimedByEmail
CREATE UNIQUE INDEX "Character_claimedByEmail_key" ON "Character"("claimedByEmail");

-- AddForeignKey: Character.claimedByEmail -> AllowedEmail.email
ALTER TABLE "Character" ADD CONSTRAINT "Character_claimedByEmail_fkey"
  FOREIGN KEY ("claimedByEmail") REFERENCES "AllowedEmail"("email")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: CharacterSheet
CREATE TABLE "CharacterSheet" (
    "id"            SERIAL NOT NULL,
    "characterId"   INTEGER NOT NULL,
    "str"           INTEGER,
    "con"           INTEGER,
    "siz"           INTEGER,
    "dex"           INTEGER,
    "intelligence"  INTEGER,
    "pow"           INTEGER,
    "cha"           INTEGER,
    "app"           INTEGER,
    "edu"           INTEGER,
    "currentHp"     INTEGER,
    "maxHp"         INTEGER,
    "currentSanity" INTEGER,
    "maxSanity"     INTEGER,
    "currentMp"     INTEGER,
    "maxMp"         INTEGER,
    "luck"          INTEGER,
    "build"         INTEGER,
    "wounds"        TEXT,
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique characterId on CharacterSheet
CREATE UNIQUE INDEX "CharacterSheet_characterId_key" ON "CharacterSheet"("characterId");

-- AddForeignKey: CharacterSheet.characterId -> Character.id
ALTER TABLE "CharacterSheet" ADD CONSTRAINT "CharacterSheet_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Skill
CREATE TABLE "Skill" (
    "id"          SERIAL NOT NULL,
    "name"        TEXT NOT NULL,
    "category"    TEXT,
    "baseValue"   INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique name on Skill
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateTable: CharacterSkillValue
CREATE TABLE "CharacterSkillValue" (
    "id"        SERIAL NOT NULL,
    "sheetId"   INTEGER NOT NULL,
    "skillId"   INTEGER NOT NULL,
    "value"     INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSkillValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique [sheetId, skillId] on CharacterSkillValue
CREATE UNIQUE INDEX "CharacterSkillValue_sheetId_skillId_key" ON "CharacterSkillValue"("sheetId", "skillId");

-- AddForeignKey: CharacterSkillValue.sheetId -> CharacterSheet.id
ALTER TABLE "CharacterSkillValue" ADD CONSTRAINT "CharacterSkillValue_sheetId_fkey"
  FOREIGN KEY ("sheetId") REFERENCES "CharacterSheet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CharacterSkillValue.skillId -> Skill.id
ALTER TABLE "CharacterSkillValue" ADD CONSTRAINT "CharacterSkillValue_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "Skill"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
