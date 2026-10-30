-- Additive records: preserve existing packs, active snapshots and prompt history.
ALTER TABLE "living_season_pack" ADD COLUMN "activeSceneAttemptId" TEXT;
ALTER TABLE "living_season_pack" ADD COLUMN "imagePromptMode" TEXT NOT NULL DEFAULT 'TEMPLATE';
ALTER TABLE "season_onboarding_run" ADD COLUMN "bannerMethod" TEXT NOT NULL DEFAULT 'AI';
ALTER TABLE "season_onboarding_run" ADD COLUMN "portraitMethod" TEXT NOT NULL DEFAULT 'AI';
ALTER TABLE "living_season_artwork" ADD COLUMN "sceneAttemptId" TEXT;
ALTER TABLE "living_season_artwork" ADD COLUMN "uploadOperationKey" TEXT;
ALTER TABLE "living_season_artwork" ADD COLUMN "uploadFingerprint" TEXT;
CREATE UNIQUE INDEX "living_season_artwork_userId_uploadOperationKey_key" ON "living_season_artwork"("userId","uploadOperationKey");
ALTER TABLE "living_season_image_run" ADD COLUMN "sceneAttemptId" TEXT;
CREATE TABLE "living_scene_attempt" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "packId" TEXT NOT NULL,
 "method" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "sourceFingerprint" TEXT NOT NULL,
 "chapter" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "living_scene_attempt_packId_userId_fkey" FOREIGN KEY ("packId","userId") REFERENCES "living_season_pack"("id","userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "living_scene_attempt_id_userId_key" ON "living_scene_attempt"("id","userId");
CREATE INDEX "living_scene_attempt_packId_method_status_idx" ON "living_scene_attempt"("packId","method","status");
CREATE TABLE "living_image_prompt_batch" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "packId" TEXT NOT NULL, "groupKey" TEXT NOT NULL,
 "version" INTEGER NOT NULL, "inputFingerprint" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'WRITING', "input" JSONB NOT NULL, "content" JSONB, "packages" JSONB NOT NULL DEFAULT '{}', "nexoRunId" TEXT, "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "living_image_prompt_batch_packId_userId_fkey" FOREIGN KEY ("packId","userId") REFERENCES "living_season_pack"("id","userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "living_image_prompt_batch_packId_groupKey_version_key" ON "living_image_prompt_batch"("packId","groupKey","version");
CREATE UNIQUE INDEX "living_image_prompt_batch_userId_requestKey_key" ON "living_image_prompt_batch"("userId","requestKey");
CREATE INDEX "living_prompt_batch_source_idx" ON "living_image_prompt_batch"("packId","groupKey","inputFingerprint","status");
CREATE TABLE "living_media_cleanup" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "packId" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0, "error" TEXT, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "living_media_cleanup_packId_userId_fkey" FOREIGN KEY ("packId","userId") REFERENCES "living_season_pack"("id","userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "living_media_cleanup_storageKey_key" ON "living_media_cleanup"("storageKey");
CREATE INDEX "living_media_cleanup_availableAt_idx" ON "living_media_cleanup"("availableAt");
-- Seed new chapter recipes from each owner's actual published wording.
WITH latest AS (
 SELECT DISTINCT ON ("userId","key") * FROM "image_direction_template_version"
 WHERE "publishedAt" IS NOT NULL AND "key" ~ '^scene-(on-track|neutral|far-behind)-(desktop|mobile)$'
 ORDER BY "userId","key","version" DESC
)
INSERT INTO "image_direction_template_version"("id","userId","key","version","text","authoring","publishedAt","createdAt")
SELECT 'chapter-recipe-' || md5(latest."id" || ':' || chapter), latest."userId",
 regexp_replace(latest."key",'^scene-','scene-chapter-' || chapter || '-'),1,latest."text",latest."authoring",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM latest CROSS JOIN generate_series(1,7) AS chapter
ON CONFLICT ("userId","key","version") DO NOTHING;
-- Preserve the latest unpublished edit as a draft for each chapter recipe.
WITH latest AS (
 SELECT DISTINCT ON ("userId","key") * FROM "image_direction_template_version"
 WHERE "key" ~ '^scene-(on-track|neutral|far-behind)-(desktop|mobile)$'
 ORDER BY "userId","key","version" DESC
)
INSERT INTO "image_direction_template_version"("id","userId","key","version","text","authoring","publishedAt","createdAt")
SELECT 'chapter-draft-' || md5(latest."id" || ':' || chapter), latest."userId",
 regexp_replace(latest."key",'^scene-','scene-chapter-' || chapter || '-'),2,latest."text",latest."authoring",NULL,CURRENT_TIMESTAMP
FROM latest CROSS JOIN generate_series(1,7) AS chapter WHERE latest."publishedAt" IS NULL
ON CONFLICT ("userId","key","version") DO NOTHING;
