CREATE TABLE "living_season_reference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "briefRevision" INTEGER NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "living_season_reference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "living_season_reference_storageKey_key" ON "living_season_reference"("storageKey");
CREATE UNIQUE INDEX "living_season_reference_packId_revision_key" ON "living_season_reference"("packId", "revision");
CREATE INDEX "living_season_reference_userId_packId_approvedAt_idx" ON "living_season_reference"("userId", "packId", "approvedAt");
ALTER TABLE "living_season_reference" ADD CONSTRAINT "living_season_reference_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "living_season_image_run" ADD COLUMN "referenceId" TEXT;
