-- Drop the overly broad uniqueness rule that blocked multiple reviewed queue items
-- for the same character and status.
DROP INDEX "ImportQueueItem_characterId_status_key";

-- Keep only one pending queue item per character while allowing multiple approved
-- or rejected history rows.
CREATE UNIQUE INDEX "ImportQueueItem_pending_character_key"
ON "ImportQueueItem"("characterId")
WHERE "characterId" IS NOT NULL AND "status" = 'PENDING';
