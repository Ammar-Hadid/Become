ALTER TABLE "exploration_uncertainty_revision" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'QUESTION', ADD COLUMN "sourceManifest" JSONB;
