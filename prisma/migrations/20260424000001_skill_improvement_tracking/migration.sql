-- AlterTable: add markedForImprovement flag to CharacterSkillValue
ALTER TABLE "CharacterSkillValue" ADD COLUMN "markedForImprovement" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add skillId to RollHistory for skill-roll improvement tracking
ALTER TABLE "RollHistory" ADD COLUMN "skillId" INTEGER;

-- AddForeignKey: RollHistory.skillId -> Skill.id (nullable, SET NULL on delete)
ALTER TABLE "RollHistory" ADD CONSTRAINT "RollHistory_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "Skill"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
