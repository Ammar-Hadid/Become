-- DropIndex
DROP INDEX "season_media_use_seasonId_mediaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "season_media_use_seasonId_mediaId_identityId_key" ON "season_media_use"("seasonId", "mediaId", "identityId");
