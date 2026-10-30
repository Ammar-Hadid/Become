ALTER TABLE "living_season_pack" ADD COLUMN "activeSnapshot" JSONB;
CREATE TABLE "living_season_source_image" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "packId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL, "adaptation" TEXT NOT NULL, "label" TEXT NOT NULL,
  "sourceUrl" TEXT, "provenance" TEXT NOT NULL DEFAULT 'UPLOAD',
  "storageKey" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
  "approvedAt" TIMESTAMP(3), "retiredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "living_season_source_image_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "living_season_source_image_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "living_season_source_image_storageKey_key" ON "living_season_source_image"("storageKey");
CREATE INDEX "living_season_source_image_userId_packId_identityId_retiredAt_idx" ON "living_season_source_image"("userId", "packId", "identityId", "retiredAt");
