CREATE TYPE "EngineeringProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE "EngineeringContext" AS ENUM ('UNI', 'INTERNSHIP', 'PERSONAL', 'PROFESSIONAL');
CREATE TYPE "EngineeringEvidenceType" AS ENUM ('FEATURE_COMPLETED', 'BUG_SOLVED', 'CONCEPT_LEARNED', 'DEPLOYMENT', 'ARCHITECTURE_DECISION', 'TECHNICAL_DISCOVERY');

CREATE TABLE "engineering_project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "status" "EngineeringProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "repositoryUrl" VARCHAR(2048),
  "liveUrl" VARCHAR(2048),
  "notes" TEXT,
  "startedOn" DATE,
  "completedOn" DATE,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "engineering_project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "engineering_project_name_not_blank" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "engineering_project_dates_valid" CHECK ("completedOn" IS NULL OR "startedOn" IS NULL OR "completedOn" >= "startedOn"),
  CONSTRAINT "engineering_project_completion_consistent" CHECK (("status" = 'COMPLETED') = ("completedOn" IS NOT NULL))
);

ALTER TABLE "session"
  ADD COLUMN "engineeringProjectId" TEXT,
  ADD COLUMN "engineeringContext" "EngineeringContext";

CREATE TABLE "engineering_evidence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "EngineeringEvidenceType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "details" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT,
  "sessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "engineering_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "engineering_evidence_title_not_blank" CHECK (length(btrim("title")) > 0)
);

CREATE UNIQUE INDEX "domain_id_userId_key" ON "domain"("id", "userId");
CREATE UNIQUE INDEX "activity_type_id_domainId_key" ON "activity_type"("id", "domainId");
CREATE UNIQUE INDEX "session_id_userId_key" ON "session"("id", "userId");
CREATE UNIQUE INDEX "engineering_project_id_userId_key" ON "engineering_project"("id", "userId");
CREATE INDEX "engineering_project_userId_archivedAt_status_idx" ON "engineering_project"("userId", "archivedAt", "status");
CREATE INDEX "session_userId_engineeringProjectId_startedAt_idx" ON "session"("userId", "engineeringProjectId", "startedAt");
CREATE INDEX "session_userId_engineeringContext_startedAt_idx" ON "session"("userId", "engineeringContext", "startedAt");
CREATE INDEX "engineering_evidence_userId_occurredAt_idx" ON "engineering_evidence"("userId", "occurredAt");
CREATE INDEX "engineering_evidence_userId_type_occurredAt_idx" ON "engineering_evidence"("userId", "type", "occurredAt");
CREATE INDEX "engineering_evidence_userId_projectId_occurredAt_idx" ON "engineering_evidence"("userId", "projectId", "occurredAt");
CREATE INDEX "engineering_evidence_userId_sessionId_idx" ON "engineering_evidence"("userId", "sessionId");

ALTER TABLE "session" DROP CONSTRAINT "session_domainId_fkey";
ALTER TABLE "session" DROP CONSTRAINT "session_activityTypeId_fkey";

ALTER TABLE "session" ADD CONSTRAINT "session_domainId_userId_fkey" FOREIGN KEY ("domainId", "userId") REFERENCES "domain"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_activityTypeId_domainId_fkey" FOREIGN KEY ("activityTypeId", "domainId") REFERENCES "activity_type"("id", "domainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_engineeringProjectId_userId_fkey" FOREIGN KEY ("engineeringProjectId", "userId") REFERENCES "engineering_project"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "engineering_project" ADD CONSTRAINT "engineering_project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engineering_evidence" ADD CONSTRAINT "engineering_evidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engineering_evidence" ADD CONSTRAINT "engineering_evidence_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "engineering_project"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "engineering_evidence" ADD CONSTRAINT "engineering_evidence_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "session"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Context is now an authoritative property of Engineering sessions. Preserve
-- historical sessions while removing the old contextual activity choices from
-- future timer starts. Existing sessions remain unassigned rather than being
-- reclassified without evidence.
UPDATE "activity_type" AS activity
SET "enabled" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "domain"
WHERE activity."domainId" = "domain"."id"
  AND "domain"."slug" = 'engineering'
  AND activity."slug" IN ('internship', 'personal-project');
