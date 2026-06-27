CREATE TYPE "AIGenerationType" AS ENUM ('CHARACTER_TEXT', 'CHARACTER_STATS_SKILLS', 'CHARACTER_BULK_TEXT');
CREATE TYPE "AIFeedbackStatus" AS ENUM ('ACCEPTED', 'EDITED', 'REJECTED');
CREATE TYPE "AITrainingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "AIGeneration" (
    "id" TEXT NOT NULL,
    "type" "AIGenerationType" NOT NULL,
    "createdByEmail" TEXT,
    "characterId" INTEGER,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT,
    "inputPayload" JSONB NOT NULL,
    "suggestion" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIFeedback" (
    "id" SERIAL NOT NULL,
    "generationId" TEXT NOT NULL,
    "status" "AIFeedbackStatus" NOT NULL,
    "createdByEmail" TEXT,
    "finalValues" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIModelVersion" (
    "id" SERIAL NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AITrainingJob" (
    "id" SERIAL NOT NULL,
    "requestedByEmail" TEXT,
    "status" "AITrainingJobStatus" NOT NULL DEFAULT 'PENDING',
    "mode" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITrainingJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIGeneration_createdByEmail_idx" ON "AIGeneration"("createdByEmail");
CREATE INDEX "AIGeneration_characterId_idx" ON "AIGeneration"("characterId");
CREATE INDEX "AIFeedback_generationId_idx" ON "AIFeedback"("generationId");
CREATE INDEX "AIFeedback_createdByEmail_idx" ON "AIFeedback"("createdByEmail");
CREATE INDEX "AITrainingJob_requestedByEmail_idx" ON "AITrainingJob"("requestedByEmail");
CREATE UNIQUE INDEX "AIModelVersion_version_key" ON "AIModelVersion"("version");

ALTER TABLE "AIGeneration"
  ADD CONSTRAINT "AIGeneration_createdByEmail_fkey"
  FOREIGN KEY ("createdByEmail") REFERENCES "AllowedEmail"("email")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AIGeneration"
  ADD CONSTRAINT "AIGeneration_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AIFeedback"
  ADD CONSTRAINT "AIFeedback_generationId_fkey"
  FOREIGN KEY ("generationId") REFERENCES "AIGeneration"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIFeedback"
  ADD CONSTRAINT "AIFeedback_createdByEmail_fkey"
  FOREIGN KEY ("createdByEmail") REFERENCES "AllowedEmail"("email")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AITrainingJob"
  ADD CONSTRAINT "AITrainingJob_requestedByEmail_fkey"
  FOREIGN KEY ("requestedByEmail") REFERENCES "AllowedEmail"("email")
  ON DELETE SET NULL ON UPDATE CASCADE;
