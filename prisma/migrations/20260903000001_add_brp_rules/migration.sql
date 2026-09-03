-- CreateTable
CREATE TABLE "BRPRule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "section" TEXT,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BRPRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BRPRuleImport" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER,
    "ruleName" TEXT NOT NULL,
    "incomingData" JSONB NOT NULL,
    "existingData" JSONB,
    "status" "ImportQueueStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByEmail" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BRPRuleImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BRPRuleImport_ruleId_status_key" ON "BRPRuleImport"("ruleId", "status");

-- AddForeignKey
ALTER TABLE "BRPRuleImport" ADD CONSTRAINT "BRPRuleImport_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "BRPRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
