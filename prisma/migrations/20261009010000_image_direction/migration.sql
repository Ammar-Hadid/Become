CREATE TABLE "image_direction_template_version" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "samplePreviews" JSONB,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "image_direction_template_version_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "image_direction_template_version_userId_key_version_key" ON "image_direction_template_version"("userId", "key", "version");
CREATE INDEX "image_direction_template_version_userId_key_publishedAt_idx" ON "image_direction_template_version"("userId", "key", "publishedAt");
ALTER TABLE "image_direction_template_version" ADD CONSTRAINT "image_direction_template_version_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "living_visual_intent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "profileVersion" INTEGER NOT NULL,
  "briefFingerprint" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "living_visual_intent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "living_visual_intent_packId_version_key" ON "living_visual_intent"("packId", "version");
CREATE INDEX "living_visual_intent_userId_packId_approvedAt_idx" ON "living_visual_intent"("userId", "packId", "approvedAt");
ALTER TABLE "living_visual_intent" ADD CONSTRAINT "living_visual_intent_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "living_season_artwork" ADD COLUMN "promptPackage" JSONB;
ALTER TABLE "living_season_artwork" ADD COLUMN "manualPromptReceipt" TEXT;
ALTER TABLE "living_season_reference" ADD COLUMN "promptPackage" JSONB;
ALTER TABLE "living_season_reference" ADD COLUMN "manualPromptReceipt" TEXT;
ALTER TABLE "living_season_image_run" ADD COLUMN "promptPackage" JSONB;
ALTER TABLE "living_season_pack" ADD COLUMN "imageDirectionStaging" JSONB;
