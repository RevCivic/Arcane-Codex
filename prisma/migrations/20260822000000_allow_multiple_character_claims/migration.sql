-- Allow an allowlisted player to be assigned more than one character.
-- A character still has at most one player through its claimedByEmail column.
DROP INDEX IF EXISTS "Character_claimedByEmail_key";

CREATE INDEX "Character_claimedByEmail_idx" ON "Character"("claimedByEmail");
