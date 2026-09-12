ALTER TABLE content ADD COLUMN "workspaceVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE content ADD CONSTRAINT content_workspace_revision_positive CHECK ("workspaceVersion">0);
