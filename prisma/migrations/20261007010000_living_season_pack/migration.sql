CREATE TABLE "living_season_pack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "identityId" TEXT,
    "visualBrief" TEXT NOT NULL DEFAULT '',
    "setting" TEXT NOT NULL DEFAULT '',
    "briefRevision" INTEGER NOT NULL DEFAULT 1,
    "activeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "living_season_pack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "living_season_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "living_season_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "living_season_artwork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "briefRevision" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "living_season_artwork_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "living_season_pack_seasonId_key" ON "living_season_pack"("seasonId");
CREATE UNIQUE INDEX "living_season_pack_id_userId_key" ON "living_season_pack"("id", "userId");
CREATE UNIQUE INDEX "living_season_pack_seasonId_userId_key" ON "living_season_pack"("seasonId", "userId");
CREATE INDEX "living_season_pack_userId_activeAt_idx" ON "living_season_pack"("userId", "activeAt");
CREATE UNIQUE INDEX "living_season_profile_packId_version_key" ON "living_season_profile"("packId", "version");
CREATE INDEX "living_season_profile_userId_packId_approvedAt_idx" ON "living_season_profile"("userId", "packId", "approvedAt");
CREATE UNIQUE INDEX "living_season_artwork_storageKey_key" ON "living_season_artwork"("storageKey");
CREATE UNIQUE INDEX "living_season_artwork_packId_chapter_state_format_revision_key" ON "living_season_artwork"("packId", "chapter", "state", "format", "revision");
CREATE INDEX "living_season_artwork_userId_packId_approvedAt_idx" ON "living_season_artwork"("userId", "packId", "approvedAt");

ALTER TABLE "living_season_pack" ADD CONSTRAINT "living_season_pack_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "living_season_profile" ADD CONSTRAINT "living_season_profile_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "living_season_artwork" ADD CONSTRAINT "living_season_artwork_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_credential" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_credential_pkey" PRIMARY KEY ("userId", "provider")
);
ALTER TABLE "ai_credential" ADD CONSTRAINT "ai_credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "living_season_image_run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "referenceArtworkId" TEXT,
    "reservedEurCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "artworkId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "living_season_image_run_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "living_season_image_run_userId_status_createdAt_idx" ON "living_season_image_run"("userId", "status", "createdAt");
CREATE INDEX "living_season_image_run_packId_chapter_state_format_idx" ON "living_season_image_run"("packId", "chapter", "state", "format");
ALTER TABLE "living_season_image_run" ADD CONSTRAINT "living_season_image_run_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
