ALTER TABLE "Character"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "referenceLinks" JSONB;

ALTER TABLE "Place"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "coordinates" TEXT,
  ADD COLUMN "mapsLink" TEXT,
  ADD COLUMN "referenceLinks" JSONB;

ALTER TABLE "InventoryItem"
  ADD COLUMN "referenceLinks" JSONB;

ALTER TABLE "Event"
  ADD COLUMN "referenceLinks" JSONB;

ALTER TABLE "Power"
  ADD COLUMN "referenceLinks" JSONB;
