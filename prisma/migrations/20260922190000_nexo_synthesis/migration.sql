ALTER TABLE "exploration_claim_revision" ADD COLUMN "sourceManifest" JSONB;
ALTER TABLE "exploration_snapshot_edition" ADD COLUMN "synthesis" JSONB;
CREATE TABLE "nexo_settings" (
 "userId" TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
 "version" INTEGER NOT NULL DEFAULT 1,
 "config" JSONB NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "nexo_run" (
 "id" TEXT PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
 "operationKey" TEXT NOT NULL,
 "taskId" TEXT NOT NULL,
 "scopeId" TEXT NOT NULL,
 "promptVersion" TEXT NOT NULL,
 "configSnapshot" JSONB NOT NULL,
 "inputFingerprint" TEXT NOT NULL,
 "input" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "output" JSONB,
 "usage" JSONB,
 "error" TEXT,
 "resultId" TEXT,
 "acceptedPayloadHash" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "nexo_run_userId_operationKey_key" ON "nexo_run"("userId","operationKey");
CREATE INDEX "nexo_run_userId_taskId_scopeId_createdAt_id_idx" ON "nexo_run"("userId","taskId","scopeId","createdAt","id");
