-- Existing interaction history is complete by definition. New live interviews opt
-- into DRAFT explicitly; this migration never invents transcript messages.
ALTER TABLE "interaction"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED';

ALTER TABLE "observation_revision"
ADD COLUMN "sourceMessageId" TEXT,
ADD COLUMN "sourceMessageRevisionId" TEXT;

-- A message-backed observation keeps the same conversation provenance as an
-- interaction-backed observation and additionally pins the exact message text.
ALTER TABLE "observation_revision"
DROP CONSTRAINT "observation_source_shape";

ALTER TABLE "observation_revision"
ADD CONSTRAINT "observation_source_shape" CHECK (
  ("sourceKind" = 'INTERACTION' AND "interactionId" IS NOT NULL AND "interactionRevisionId" IS NOT NULL AND "sourceMessageId" IS NULL AND "sourceMessageRevisionId" IS NULL AND "sourceUrl" IS NULL) OR
  ("sourceKind" = 'MESSAGE' AND "interactionId" IS NOT NULL AND "interactionRevisionId" IS NOT NULL AND "sourceMessageId" IS NOT NULL AND "sourceMessageRevisionId" IS NOT NULL AND "sourceUrl" IS NULL) OR
  ("sourceKind" = 'DIRECT_OBSERVATION' AND "interactionId" IS NULL AND "interactionRevisionId" IS NULL AND "sourceMessageId" IS NULL AND "sourceMessageRevisionId" IS NULL AND "sourceUrl" IS NULL) OR
  ("sourceKind" = 'PUBLIC_SOURCE' AND "interactionId" IS NULL AND "interactionRevisionId" IS NULL AND "sourceMessageId" IS NULL AND "sourceMessageRevisionId" IS NULL AND "sourceUrl" IS NOT NULL)
);

CREATE TABLE "exploration_claim" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_claim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_claim_revision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lane" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "correctionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_claim_revision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_claim_citation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "claimRevisionId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "observationRevisionId" TEXT NOT NULL,
  "stance" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_claim_citation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_uncertainty" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "resolvedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_uncertainty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_uncertainty_revision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "uncertaintyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "lane" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "correctionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_uncertainty_revision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_snapshot_edition" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "coverage" JSONB NOT NULL,
  "recommendation" JSONB NOT NULL,
  "sourceCursor" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exploration_snapshot_edition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exploration_snapshot_claim" (
  "userId" TEXT NOT NULL,
  "editionId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "claimRevisionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "exploration_snapshot_claim_pkey" PRIMARY KEY ("editionId", "claimId")
);

CREATE TABLE "exploration_snapshot_uncertainty" (
  "userId" TEXT NOT NULL,
  "editionId" TEXT NOT NULL,
  "uncertaintyId" TEXT NOT NULL,
  "uncertaintyRevisionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "exploration_snapshot_uncertainty_pkey" PRIMARY KEY ("editionId", "uncertaintyId")
);

CREATE TABLE "interview_guide" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nicheId" TEXT NOT NULL,
  "segmentId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "marketType" TEXT NOT NULL,
  "expectedDurationMinutes" INTEGER NOT NULL,
  "draftDocument" JSONB NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interview_guide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_guide_revision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "objectiveSnapshot" TEXT NOT NULL,
  "marketType" TEXT NOT NULL,
  "segmentId" TEXT,
  "segmentSnapshot" TEXT,
  "expectedDurationMinutes" INTEGER NOT NULL,
  "document" JSONB NOT NULL,
  "questionIndex" JSONB NOT NULL DEFAULT '[]',
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_guide_revision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_session" (
  "interactionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "guideRevisionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currentQuestionId" TEXT,
  "skippedQuestionIds" JSONB NOT NULL DEFAULT '[]',
  "outcome" TEXT,
  "nextAction" TEXT,
  "takeaways" JSONB NOT NULL DEFAULT '[]',
  "summary" TEXT,
  "cancelReason" TEXT,
  "debriefCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interview_session_pkey" PRIMARY KEY ("interactionId")
);

CREATE TABLE "conversation_message" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL,
  "operationKey" TEXT NOT NULL,
  "bookmarkedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_message_revision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "interactionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "speakerRole" TEXT NOT NULL,
  "speakerNameSnapshot" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "channel" TEXT NOT NULL,
  "guideQuestionId" TEXT,
  "correctionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_message_revision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exploration_claim_niche_active_idx" ON "exploration_claim"("nicheId", "archivedAt", "createdAt", "id");
CREATE UNIQUE INDEX "exploration_claim_owned" ON "exploration_claim"("id", "userId");
CREATE UNIQUE INDEX "exploration_claim_owned_niche" ON "exploration_claim"("id", "nicheId", "userId");
CREATE INDEX "exploration_claim_revision_niche_idx" ON "exploration_claim_revision"("nicheId", "createdAt", "id");
CREATE UNIQUE INDEX "exploration_claim_revision_version" ON "exploration_claim_revision"("claimId", "version");
CREATE UNIQUE INDEX "exploration_claim_revision_owned" ON "exploration_claim_revision"("id", "userId");
CREATE UNIQUE INDEX "exploration_claim_revision_logical" ON "exploration_claim_revision"("id", "claimId", "userId");
CREATE UNIQUE INDEX "exploration_claim_citation_source" ON "exploration_claim_citation"("claimRevisionId", "observationRevisionId");
CREATE INDEX "exploration_claim_citation_observation" ON "exploration_claim_citation"("observationId", "observationRevisionId");

CREATE INDEX "exploration_uncertainty_active_idx" ON "exploration_uncertainty"("nicheId", "resolvedAt", "archivedAt", "createdAt", "id");
CREATE UNIQUE INDEX "exploration_uncertainty_owned" ON "exploration_uncertainty"("id", "userId");
CREATE UNIQUE INDEX "exploration_uncertainty_owned_niche" ON "exploration_uncertainty"("id", "nicheId", "userId");
CREATE INDEX "exploration_uncertainty_revision_niche_idx" ON "exploration_uncertainty_revision"("nicheId", "createdAt", "id");
CREATE UNIQUE INDEX "exploration_uncertainty_revision_version" ON "exploration_uncertainty_revision"("uncertaintyId", "version");
CREATE UNIQUE INDEX "exploration_uncertainty_revision_owned" ON "exploration_uncertainty_revision"("id", "userId");
CREATE UNIQUE INDEX "exploration_uncertainty_revision_logical" ON "exploration_uncertainty_revision"("id", "uncertaintyId", "userId");

CREATE INDEX "exploration_snapshot_edition_niche_idx" ON "exploration_snapshot_edition"("nicheId", "publishedAt", "id");
CREATE UNIQUE INDEX "exploration_snapshot_edition_owned" ON "exploration_snapshot_edition"("id", "userId");
CREATE UNIQUE INDEX "exploration_snapshot_edition_number" ON "exploration_snapshot_edition"("nicheId", "number");
CREATE UNIQUE INDEX "exploration_snapshot_claim_position" ON "exploration_snapshot_claim"("editionId", "position");
CREATE UNIQUE INDEX "exploration_snapshot_uncertainty_position" ON "exploration_snapshot_uncertainty"("editionId", "position");

CREATE INDEX "interview_guide_niche_active_idx" ON "interview_guide"("nicheId", "archivedAt", "updatedAt", "id");
CREATE UNIQUE INDEX "interview_guide_owned" ON "interview_guide"("id", "userId");
CREATE INDEX "interview_guide_revision_guide_idx" ON "interview_guide_revision"("guideId", "publishedAt", "id");
CREATE UNIQUE INDEX "interview_guide_revision_version" ON "interview_guide_revision"("guideId", "version");
CREATE UNIQUE INDEX "interview_guide_revision_owned" ON "interview_guide_revision"("id", "userId");
CREATE INDEX "interview_session_resume_idx" ON "interview_session"("userId", "status", "updatedAt");
CREATE UNIQUE INDEX "interview_session_owned" ON "interview_session"("interactionId", "userId");

CREATE INDEX "conversation_message_thread_idx" ON "conversation_message"("interactionId", "voidedAt", "position");
CREATE UNIQUE INDEX "conversation_message_owned" ON "conversation_message"("id", "userId");
CREATE UNIQUE INDEX "conversation_message_owned_thread" ON "conversation_message"("id", "interactionId", "userId");
CREATE UNIQUE INDEX "conversation_message_operation" ON "conversation_message"("userId", "operationKey");
CREATE UNIQUE INDEX "conversation_message_position" ON "conversation_message"("interactionId", "position");
CREATE INDEX "conversation_message_revision_thread_idx" ON "conversation_message_revision"("interactionId", "occurredAt", "id");
CREATE UNIQUE INDEX "conversation_message_revision_version" ON "conversation_message_revision"("messageId", "version");
CREATE UNIQUE INDEX "conversation_message_revision_logical" ON "conversation_message_revision"("id", "messageId", "userId");

ALTER TABLE "interaction" ADD CONSTRAINT "interaction_status_values" CHECK ("status" IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
ALTER TABLE "exploration_claim" ADD CONSTRAINT "exploration_claim_values" CHECK (version > 0);
ALTER TABLE "exploration_claim_revision" ADD CONSTRAINT "exploration_claim_revision_values" CHECK (version > 0 AND lane IN ('B2C', 'B2B', 'CROSS_MARKET') AND kind IN ('OBSERVED', 'INTERPRETATION') AND length(trim(statement)) > 0);
ALTER TABLE "exploration_claim_citation" ADD CONSTRAINT "exploration_claim_citation_values" CHECK (stance IN ('SUPPORTS', 'CONTRADICTS', 'CONTEXT'));
ALTER TABLE "exploration_uncertainty" ADD CONSTRAINT "exploration_uncertainty_values" CHECK (version > 0);
ALTER TABLE "exploration_uncertainty_revision" ADD CONSTRAINT "exploration_uncertainty_revision_values" CHECK (version > 0 AND lane IN ('B2C', 'B2B', 'CROSS_MARKET') AND length(trim(statement)) > 0);
ALTER TABLE "exploration_snapshot_edition" ADD CONSTRAINT "exploration_snapshot_edition_values" CHECK (number > 0);
ALTER TABLE "exploration_snapshot_claim" ADD CONSTRAINT "exploration_snapshot_claim_values" CHECK (position >= 0);
ALTER TABLE "exploration_snapshot_uncertainty" ADD CONSTRAINT "exploration_snapshot_uncertainty_values" CHECK (position >= 0);
ALTER TABLE "interview_guide" ADD CONSTRAINT "interview_guide_values" CHECK (version > 0 AND "marketType" IN ('B2C', 'B2B') AND "expectedDurationMinutes" BETWEEN 5 AND 240 AND length(trim(title)) > 0 AND length(trim(objective)) > 0);
ALTER TABLE "interview_guide_revision" ADD CONSTRAINT "interview_guide_revision_values" CHECK (version > 0 AND "marketType" IN ('B2C', 'B2B') AND "expectedDurationMinutes" BETWEEN 5 AND 240 AND length(trim("titleSnapshot")) > 0 AND length(trim("objectiveSnapshot")) > 0);
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_values" CHECK (
  status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') AND
  (status <> 'COMPLETED' OR ("debriefCompletedAt" IS NOT NULL AND length(trim(outcome)) > 0))
);
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_values" CHECK (
  version > 0 AND position >= 0 AND length(trim("operationKey")) > 0 AND
  (("voidedAt" IS NULL AND "voidReason" IS NULL) OR ("voidedAt" IS NOT NULL AND length(trim("voidReason")) > 0))
);
ALTER TABLE "conversation_message_revision" ADD CONSTRAINT "conversation_message_revision_values" CHECK (
  version > 0 AND "speakerRole" IN ('ME', 'PARTICIPANT') AND length(trim("speakerNameSnapshot")) > 0 AND length(trim(body)) > 0
);

ALTER TABLE "exploration_claim" ADD CONSTRAINT "exploration_claim_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_claim" ADD CONSTRAINT "exploration_claim_niche" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_claim_revision" ADD CONSTRAINT "exploration_claim_revision_claim" FOREIGN KEY ("claimId", "nicheId", "userId") REFERENCES "exploration_claim"("id", "nicheId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_claim_citation" ADD CONSTRAINT "exploration_claim_citation_claim_revision" FOREIGN KEY ("claimRevisionId", "userId") REFERENCES "exploration_claim_revision"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_claim_citation" ADD CONSTRAINT "exploration_claim_citation_observation" FOREIGN KEY ("observationId", "userId") REFERENCES "observation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exploration_claim_citation" ADD CONSTRAINT "exploration_claim_citation_observation_revision" FOREIGN KEY ("observationRevisionId", "observationId", "userId") REFERENCES "observation_revision"("id", "observationId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exploration_uncertainty" ADD CONSTRAINT "exploration_uncertainty_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_uncertainty" ADD CONSTRAINT "exploration_uncertainty_niche" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_uncertainty_revision" ADD CONSTRAINT "exploration_uncertainty_revision_item" FOREIGN KEY ("uncertaintyId", "nicheId", "userId") REFERENCES "exploration_uncertainty"("id", "nicheId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exploration_snapshot_edition" ADD CONSTRAINT "exploration_snapshot_edition_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_edition" ADD CONSTRAINT "exploration_snapshot_edition_niche" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_claim" ADD CONSTRAINT "exploration_snapshot_claim_edition" FOREIGN KEY ("editionId", "userId") REFERENCES "exploration_snapshot_edition"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_claim" ADD CONSTRAINT "exploration_snapshot_claim_claim" FOREIGN KEY ("claimId", "userId") REFERENCES "exploration_claim"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_claim" ADD CONSTRAINT "exploration_snapshot_claim_revision" FOREIGN KEY ("claimRevisionId", "claimId", "userId") REFERENCES "exploration_claim_revision"("id", "claimId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_uncertainty" ADD CONSTRAINT "exploration_snapshot_uncertainty_edition" FOREIGN KEY ("editionId", "userId") REFERENCES "exploration_snapshot_edition"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_uncertainty" ADD CONSTRAINT "exploration_snapshot_uncertainty_item" FOREIGN KEY ("uncertaintyId", "userId") REFERENCES "exploration_uncertainty"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exploration_snapshot_uncertainty" ADD CONSTRAINT "exploration_snapshot_uncertainty_revision" FOREIGN KEY ("uncertaintyRevisionId", "uncertaintyId", "userId") REFERENCES "exploration_uncertainty_revision"("id", "uncertaintyId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "interview_guide" ADD CONSTRAINT "interview_guide_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_guide" ADD CONSTRAINT "interview_guide_niche" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_guide" ADD CONSTRAINT "interview_guide_segment" FOREIGN KEY ("segmentId", "userId") REFERENCES "audience_segment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_guide_revision" ADD CONSTRAINT "interview_guide_revision_guide" FOREIGN KEY ("guideId", "userId") REFERENCES "interview_guide"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_interaction" FOREIGN KEY ("interactionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_guide_revision" FOREIGN KEY ("guideRevisionId", "userId") REFERENCES "interview_guide_revision"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_interaction" FOREIGN KEY ("interactionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_message_revision" ADD CONSTRAINT "conversation_message_revision_message" FOREIGN KEY ("messageId", "interactionId", "userId") REFERENCES "conversation_message"("id", "interactionId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_source_message" FOREIGN KEY ("sourceMessageId", "userId") REFERENCES "conversation_message"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_source_message_revision" FOREIGN KEY ("sourceMessageRevisionId", "sourceMessageId", "userId") REFERENCES "conversation_message_revision"("id", "messageId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
