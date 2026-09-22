ALTER TABLE "nexo_run" ADD COLUMN "taskVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "nexo_run" ADD CONSTRAINT "nexo_task_version_positive" CHECK ("taskVersion">0);
