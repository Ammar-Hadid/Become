-- AlterTable
ALTER TABLE "user_season" ADD COLUMN     "openingDeferredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "season_quote" ADD COLUMN     "identityId" TEXT,
ADD COLUMN     "rotation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "season_cots_identity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "subjectKind" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "selectionRevision" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_cots_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_cots_context" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "registryVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceWork" TEXT NOT NULL DEFAULT '',
    "adaptation" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_cots_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_cots_candidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_cots_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_cots_selection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SELECTED',
    "desiredPoster" BOOLEAN NOT NULL DEFAULT false,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "storageKey" TEXT,
    "mediaId" TEXT,
    "quoteId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_cots_selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_media_use" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "identityId" TEXT,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "poster" BOOLEAN NOT NULL DEFAULT false,
    "secondary" BOOLEAN NOT NULL DEFAULT true,
    "loading" BOOLEAN NOT NULL DEFAULT true,
    "cadence" BOOLEAN NOT NULL DEFAULT true,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_media_use_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cots_provider_counter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "cooldownUntil" TIMESTAMP(3),

    CONSTRAINT "cots_provider_counter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "season_cots_identity_seasonId_active_idx" ON "season_cots_identity"("seasonId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "season_cots_identity_id_userId_key" ON "season_cots_identity"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "season_cots_context_identityId_revision_key" ON "season_cots_context"("identityId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "season_cots_context_id_userId_key" ON "season_cots_context"("id", "userId");

-- CreateIndex
CREATE INDEX "season_cots_candidate_userId_expiresAt_idx" ON "season_cots_candidate"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "season_cots_candidate_userId_identityId_contextId_sourceKey_key" ON "season_cots_candidate"("userId", "identityId", "contextId", "sourceKey");

-- CreateIndex
CREATE INDEX "season_cots_selection_userId_status_leaseUntil_idx" ON "season_cots_selection"("userId", "status", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "season_cots_selection_userId_identityId_candidateId_key" ON "season_cots_selection"("userId", "identityId", "candidateId");

-- CreateIndex
CREATE INDEX "season_media_use_userId_seasonId_identityId_retiredAt_idx" ON "season_media_use"("userId", "seasonId", "identityId", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "season_media_use_seasonId_mediaId_key" ON "season_media_use"("seasonId", "mediaId");

-- AddForeignKey
ALTER TABLE "season_cots_identity" ADD CONSTRAINT "season_cots_identity_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_cots_context" ADD CONSTRAINT "season_cots_context_identityId_userId_fkey" FOREIGN KEY ("identityId", "userId") REFERENCES "season_cots_identity"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_cots_candidate" ADD CONSTRAINT "season_cots_candidate_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_cots_selection" ADD CONSTRAINT "season_cots_selection_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_media_use" ADD CONSTRAINT "season_media_use_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_media_use" ADD CONSTRAINT "season_media_use_mediaId_userId_fkey" FOREIGN KEY ("mediaId", "userId") REFERENCES "season_media"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Additive preservation: never guess a legacy category or rewrite original media/history.
INSERT INTO "season_cots_identity" ("id", "userId", "seasonId", "displayName", "subjectKind", "savedAt")
SELECT 'legacy-' || "id", "userId", "id", "character"->>'name', 'UNKNOWN', "openingCompletedAt"
FROM "user_season" WHERE "openingCompletedAt" IS NOT NULL AND length(trim(COALESCE("character"->>'name', ''))) > 0;
INSERT INTO "season_media_use" ("id", "userId", "seasonId", "mediaId", "identityId", "focalX", "focalY", "poster", "retiredAt", "createdAt")
SELECT 'legacy-' || m."id", m."userId", m."seasonId", m."id", i."id", m."focalX", m."focalY", m."poster", m."retiredAt", m."createdAt"
FROM "season_media" m LEFT JOIN "season_cots_identity" i ON i."seasonId" = m."seasonId" AND i."userId" = m."userId";
UPDATE "season_quote" q SET "identityId" = i."id" FROM "season_cots_identity" i WHERE i."seasonId" = q."seasonId" AND i."userId" = q."userId";

CREATE UNIQUE INDEX "cots_one_active_identity" ON "season_cots_identity"("seasonId") WHERE "active";
CREATE UNIQUE INDEX "cots_identity_owned_season" ON "season_cots_identity"("id", "seasonId", "userId");
CREATE UNIQUE INDEX "cots_context_owned_identity" ON "season_cots_context"("id", "identityId", "userId");
CREATE UNIQUE INDEX "cots_candidate_owned_context" ON "season_cots_candidate"("id", "identityId", "contextId", "seasonId", "userId");
CREATE UNIQUE INDEX "cots_one_active_poster" ON "season_media_use"("seasonId") WHERE "poster" AND "retiredAt" IS NULL;
ALTER TABLE "season_cots_candidate" ADD CONSTRAINT "cots_candidate_identity" FOREIGN KEY ("identityId", "seasonId", "userId") REFERENCES "season_cots_identity"("id", "seasonId", "userId") ON DELETE CASCADE;
ALTER TABLE "season_cots_candidate" ADD CONSTRAINT "cots_candidate_context" FOREIGN KEY ("contextId", "identityId", "userId") REFERENCES "season_cots_context"("id", "identityId", "userId") ON DELETE CASCADE;
ALTER TABLE "season_cots_selection" ADD CONSTRAINT "cots_selection_candidate" FOREIGN KEY ("candidateId", "identityId", "contextId", "seasonId", "userId") REFERENCES "season_cots_candidate"("id", "identityId", "contextId", "seasonId", "userId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "season_media_use" ADD CONSTRAINT "cots_use_identity" FOREIGN KEY ("identityId", "seasonId", "userId") REFERENCES "season_cots_identity"("id", "seasonId", "userId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "season_quote" ADD CONSTRAINT "cots_quote_identity" FOREIGN KEY ("identityId", "seasonId", "userId") REFERENCES "season_cots_identity"("id", "seasonId", "userId") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "season_cots_selection" ADD CONSTRAINT "cots_selection_status" CHECK ("status" IN ('SELECTED','PENDING','IMPORTING','READY','FAILED'));
ALTER TABLE "season_cots_selection" ADD CONSTRAINT "cots_selection_ready" CHECK ("status" <> 'READY' OR "mediaId" IS NOT NULL OR "quoteId" IS NOT NULL);
ALTER TABLE "season_media_use" ADD CONSTRAINT "cots_use_focal_bounds" CHECK ("focalX" BETWEEN 0 AND 1 AND "focalY" BETWEEN 0 AND 1);
