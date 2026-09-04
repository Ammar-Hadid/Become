-- Project context describes the project itself and remains independent from
-- the context stored on each Engineering session. Existing projects are
-- assigned the deterministic Personal default rather than inferred from their
-- historical sessions.
ALTER TABLE "engineering_project"
  ADD COLUMN "context" "EngineeringContext" NOT NULL DEFAULT 'PERSONAL';

CREATE INDEX "engineering_project_userId_context_createdAt_idx"
  ON "engineering_project"("userId", "context", "createdAt");
