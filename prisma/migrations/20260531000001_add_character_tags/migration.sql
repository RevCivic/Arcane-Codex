CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE TABLE "_CharacterToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_CharacterToTag_AB_unique" ON "_CharacterToTag"("A", "B");
CREATE INDEX "_CharacterToTag_B_index" ON "_CharacterToTag"("B");

ALTER TABLE "_CharacterToTag"
    ADD CONSTRAINT "_CharacterToTag_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_CharacterToTag"
    ADD CONSTRAINT "_CharacterToTag_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
