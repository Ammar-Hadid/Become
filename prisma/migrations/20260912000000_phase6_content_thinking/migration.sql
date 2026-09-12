-- AlterTable
ALTER TABLE "session" ADD COLUMN     "contentActivitySnapshot" TEXT,
ADD COLUMN     "contentId" TEXT,
ADD COLUMN     "contentTitleSnapshot" TEXT,
ADD COLUMN     "contentVariantId" TEXT,
ADD COLUMN     "contentVariantSnapshot" TEXT;

-- AlterTable
ALTER TABLE "direction_criterion" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "contentFormat" TEXT,
ADD COLUMN     "contentId" TEXT,
ADD COLUMN     "selectedContentOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_variant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "writingVersion" INTEGER NOT NULL DEFAULT 1,
    "mediaVersion" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PLANNING',
    "hook" TEXT NOT NULL DEFAULT '',
    "outline" TEXT NOT NULL DEFAULT '',
    "script" TEXT NOT NULL DEFAULT '',
    "productionNotes" TEXT NOT NULL DEFAULT '',
    "nextStep" TEXT NOT NULL DEFAULT '',
    "plannedOn" DATE,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "writingSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_channel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "account" TEXT NOT NULL DEFAULT '',
    "platformLabel" TEXT NOT NULL DEFAULT '',
    "identity" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_publication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedTitle" TEXT NOT NULL,
    "publishedOn" DATE NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "url" TEXT NOT NULL DEFAULT '',
    "placement" TEXT NOT NULL DEFAULT '',
    "identityKey" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL DEFAULT 'MANUAL',
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_publication_revision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_publication_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_performance_observation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" BIGINT,
    "likes" BIGINT,
    "comments" BIGINT,
    "note" TEXT NOT NULL DEFAULT '',
    "sourceKind" TEXT NOT NULL DEFAULT 'MANUAL',
    "supersedesId" TEXT,
    "correctionReason" TEXT,

    CONSTRAINT "content_performance_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_mutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_mutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direction_idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_idea_domain" (
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "direction_idea_domain_pkey" PRIMARY KEY ("ideaId","domainId")
);

-- CreateTable
CREATE TABLE "direction_idea_output" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "contentId" TEXT,
    "goalId" TEXT,
    "experimentId" TEXT,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direction_idea_output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_idea_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direction_idea_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_decision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "choice" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedOn" DATE NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "alternatives" TEXT NOT NULL DEFAULT '',
    "expectedOutcome" TEXT NOT NULL DEFAULT '',
    "reconsiderWhen" TEXT NOT NULL DEFAULT '',
    "reviewOn" DATE,
    "contentId" TEXT,
    "projectId" TEXT,
    "goalId" TEXT,
    "experimentId" TEXT,
    "nicheId" TEXT,
    "seasonId" TEXT,
    "supersedesId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direction_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_decision_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direction_decision_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_decision_reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "reflection" TEXT NOT NULL,
    "reflectedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direction_decision_reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_thinking_mutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direction_thinking_mutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_content_source" (
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "experiment_content_source_pkey" PRIMARY KEY ("experimentId","contentId")
);

-- CreateIndex
CREATE INDEX "content_userId_archivedAt_updatedAt_id_idx" ON "content"("userId", "archivedAt", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "content_userId_createdAt_id_idx" ON "content"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "content_id_userId_key" ON "content"("id", "userId");

-- CreateIndex
CREATE INDEX "content_variant_userId_createdAt_id_idx" ON "content_variant"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "content_variant_contentId_createdAt_id_idx" ON "content_variant"("contentId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "content_variant_id_userId_key" ON "content_variant"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_variant_id_contentId_userId_key" ON "content_variant"("id", "contentId", "userId");

-- CreateIndex
CREATE INDEX "content_channel_userId_archivedAt_idx" ON "content_channel"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_channel_id_userId_key" ON "content_channel"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_channel_userId_platform_identity_key" ON "content_channel"("userId", "platform", "identity");

-- CreateIndex
CREATE INDEX "content_publication_userId_publishedOn_id_idx" ON "content_publication"("userId", "publishedOn", "id");

-- CreateIndex
CREATE INDEX "content_publication_variantId_publishedOn_id_idx" ON "content_publication"("variantId", "publishedOn", "id");

-- CreateIndex
CREATE UNIQUE INDEX "content_publication_id_userId_key" ON "content_publication"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_publication_userId_identityKey_key" ON "content_publication"("userId", "identityKey");

-- CreateIndex
CREATE UNIQUE INDEX "content_publication_revision_publicationId_version_key" ON "content_publication_revision"("publicationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "content_performance_observation_supersedesId_key" ON "content_performance_observation"("supersedesId");

-- CreateIndex
CREATE INDEX "content_performance_observation_userId_publicationId_observ_idx" ON "content_performance_observation"("userId", "publicationId", "observedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "content_performance_observation_id_publicationId_userId_key" ON "content_performance_observation"("id", "publicationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_media_storageKey_key" ON "content_media"("storageKey");

-- CreateIndex
CREATE INDEX "content_media_variantId_retiredAt_idx" ON "content_media"("variantId", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_media_id_userId_key" ON "content_media"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "content_mutation_userId_operationKey_key" ON "content_mutation"("userId", "operationKey");

-- CreateIndex
CREATE INDEX "direction_idea_userId_archivedAt_createdAt_id_idx" ON "direction_idea"("userId", "archivedAt", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "direction_idea_id_userId_key" ON "direction_idea"("id", "userId");

-- CreateIndex
CREATE INDEX "direction_idea_output_userId_createdAt_idx" ON "direction_idea_output"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "direction_idea_output_ideaId_contentId_key" ON "direction_idea_output"("ideaId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_idea_output_ideaId_goalId_key" ON "direction_idea_output"("ideaId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_idea_output_ideaId_experimentId_key" ON "direction_idea_output"("ideaId", "experimentId");

-- CreateIndex
CREATE INDEX "direction_idea_change_ideaId_createdAt_id_idx" ON "direction_idea_change"("ideaId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "direction_decision_supersedesId_key" ON "direction_decision"("supersedesId");

-- CreateIndex
CREATE INDEX "direction_decision_userId_archivedAt_decidedOn_id_idx" ON "direction_decision"("userId", "archivedAt", "decidedOn", "id");

-- CreateIndex
CREATE UNIQUE INDEX "direction_decision_id_userId_key" ON "direction_decision"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_decision_change_decisionId_version_key" ON "direction_decision_change"("decisionId", "version");

-- CreateIndex
CREATE INDEX "direction_decision_reflection_decisionId_reflectedOn_id_idx" ON "direction_decision_reflection"("decisionId", "reflectedOn", "id");

-- CreateIndex
CREATE UNIQUE INDEX "direction_thinking_mutation_userId_operationKey_key" ON "direction_thinking_mutation"("userId", "operationKey");

-- CreateIndex
CREATE INDEX "session_userId_contentId_startedAt_idx" ON "session"("userId", "contentId", "startedAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_contentVariantId_contentId_userId_fkey" FOREIGN KEY ("contentVariantId", "contentId", "userId") REFERENCES "content_variant"("id", "contentId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_channelId_userId_fkey" FOREIGN KEY ("channelId", "userId") REFERENCES "content_channel"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_variant" ADD CONSTRAINT "content_variant_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_channel" ADD CONSTRAINT "content_channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_publication" ADD CONSTRAINT "content_publication_variantId_userId_fkey" FOREIGN KEY ("variantId", "userId") REFERENCES "content_variant"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_publication" ADD CONSTRAINT "content_publication_channelId_userId_fkey" FOREIGN KEY ("channelId", "userId") REFERENCES "content_channel"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_publication_revision" ADD CONSTRAINT "content_publication_revision_publicationId_userId_fkey" FOREIGN KEY ("publicationId", "userId") REFERENCES "content_publication"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance_observation" ADD CONSTRAINT "content_performance_observation_publicationId_userId_fkey" FOREIGN KEY ("publicationId", "userId") REFERENCES "content_publication"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance_observation" ADD CONSTRAINT "content_performance_observation_supersedesId_publicationId_fkey" FOREIGN KEY ("supersedesId", "publicationId", "userId") REFERENCES "content_performance_observation"("id", "publicationId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_variantId_userId_fkey" FOREIGN KEY ("variantId", "userId") REFERENCES "content_variant"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mutation" ADD CONSTRAINT "content_mutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea" ADD CONSTRAINT "direction_idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_domain" ADD CONSTRAINT "direction_idea_domain_ideaId_userId_fkey" FOREIGN KEY ("ideaId", "userId") REFERENCES "direction_idea"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_domain" ADD CONSTRAINT "direction_idea_domain_domainId_userId_fkey" FOREIGN KEY ("domainId", "userId") REFERENCES "domain"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_output" ADD CONSTRAINT "direction_idea_output_ideaId_userId_fkey" FOREIGN KEY ("ideaId", "userId") REFERENCES "direction_idea"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_output" ADD CONSTRAINT "direction_idea_output_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_output" ADD CONSTRAINT "direction_idea_output_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_output" ADD CONSTRAINT "direction_idea_output_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_idea_change" ADD CONSTRAINT "direction_idea_change_ideaId_userId_fkey" FOREIGN KEY ("ideaId", "userId") REFERENCES "direction_idea"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "engineering_project"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision" ADD CONSTRAINT "direction_decision_supersedesId_userId_fkey" FOREIGN KEY ("supersedesId", "userId") REFERENCES "direction_decision"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision_change" ADD CONSTRAINT "direction_decision_change_decisionId_userId_fkey" FOREIGN KEY ("decisionId", "userId") REFERENCES "direction_decision"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_decision_reflection" ADD CONSTRAINT "direction_decision_reflection_decisionId_userId_fkey" FOREIGN KEY ("decisionId", "userId") REFERENCES "direction_decision"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_thinking_mutation" ADD CONSTRAINT "direction_thinking_mutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_content_source" ADD CONSTRAINT "experiment_content_source_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_content_source" ADD CONSTRAINT "experiment_content_source_contentId_userId_fkey" FOREIGN KEY ("contentId", "userId") REFERENCES "content"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename the existing domain in place. Never merge another domain silently.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "domain" a JOIN "domain" b ON a."userId"=b."userId" WHERE a.slug='youtube' AND b.slug='content') THEN
    RAISE EXCEPTION 'Phase 6 domain collision: resolve the existing content/youtube domains explicitly before migration';
  END IF;
END $$;
UPDATE "domain" SET slug='content', name=CASE WHEN name='YouTube' THEN 'Content' ELSE name END WHERE slug='youtube';
ALTER TABLE content ADD CONSTRAINT content_version_positive CHECK (version > 0);
ALTER TABLE content_variant ADD CONSTRAINT content_variant_values CHECK (
 version>0 AND "writingVersion">0 AND "mediaVersion">0 AND format IN ('LONG_FORM','SHORT_VERTICAL','OTHER') AND stage IN ('PLANNING','WRITING','RECORDING','EDITING','READY'));
ALTER TABLE content_channel ADD CONSTRAINT content_channel_values CHECK (version>0 AND platform IN ('YOUTUBE','TIKTOK','INSTAGRAM','OTHER'));
ALTER TABLE content_publication ADD CONSTRAINT content_publication_values CHECK (version>0 AND "sourceKind"='MANUAL' AND (("withdrawnAt" IS NULL AND "withdrawalReason" IS NULL) OR ("withdrawnAt" IS NOT NULL AND length(trim("withdrawalReason"))>0)));
ALTER TABLE content_performance_observation ADD CONSTRAINT content_observation_values CHECK (
  "sourceKind"='MANUAL' AND (views IS NOT NULL OR likes IS NOT NULL OR comments IS NOT NULL) AND
  (views IS NULL OR views>=0) AND (likes IS NULL OR likes>=0) AND (comments IS NULL OR comments>=0) AND
  ("supersedesId" IS NULL OR ("supersedesId"<>id AND length(trim("correctionReason"))>0)));
ALTER TABLE direction_idea_output ADD CONSTRAINT idea_output_exactly_one CHECK (num_nonnulls("contentId","goalId","experimentId")=1 AND kind IN ('CREATED','LINKED'));
ALTER TABLE direction_decision ADD CONSTRAINT decision_values CHECK (version>0 AND ("supersedesId" IS NULL OR "supersedesId"<>id));
ALTER TABLE direction_decision_reflection ADD CONSTRAINT decision_assessment CHECK (assessment IN ('HELPFUL','MIXED','NOT_HELPFUL','TOO_EARLY'));
ALTER TABLE session ADD CONSTRAINT session_content_variant_parent CHECK ("contentVariantId" IS NULL OR "contentId" IS NOT NULL);
CREATE UNIQUE INDEX content_media_one_current ON content_media ("variantId") WHERE "retiredAt" IS NULL;
