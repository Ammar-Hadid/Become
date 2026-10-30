ALTER TABLE "living_season_pack" ADD COLUMN "referenceMode" TEXT NOT NULL DEFAULT 'SHEET';

CREATE TABLE "season_onboarding_run" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "packId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL, "identityRevision" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0, "stage" TEXT NOT NULL DEFAULT 'WORLD',
  "status" TEXT NOT NULL DEFAULT 'WAITING', "chapter" INTEGER NOT NULL DEFAULT 1,
  "briefRevision" INTEGER NOT NULL, "profileVersion" INTEGER NOT NULL DEFAULT 0,
  "intentVersion" INTEGER NOT NULL DEFAULT 0,
  "draft" JSONB, "research" JSONB, "correction" TEXT NOT NULL DEFAULT '', "question" TEXT,
  "pendingImages" JSONB NOT NULL DEFAULT '[]', "completedTasks" JSONB NOT NULL DEFAULT '[]',
  "error" TEXT, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "season_onboarding_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "season_onboarding_run_packId_userId_fkey" FOREIGN KEY ("packId", "userId") REFERENCES "living_season_pack"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "season_onboarding_run_packId_key" ON "season_onboarding_run"("packId");
CREATE UNIQUE INDEX "season_onboarding_run_packId_userId_key" ON "season_onboarding_run"("packId", "userId");
CREATE UNIQUE INDEX "season_onboarding_run_id_userId_key" ON "season_onboarding_run"("id", "userId");
CREATE INDEX "season_onboarding_run_status_leaseUntil_updatedAt_idx" ON "season_onboarding_run"("status", "leaseUntil", "updatedAt");

CREATE TABLE "season_onboarding_command" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "runId" TEXT NOT NULL,
  "operationKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "season_onboarding_command_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "season_onboarding_command_runId_userId_fkey" FOREIGN KEY ("runId", "userId") REFERENCES "season_onboarding_run"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "season_onboarding_command_userId_operationKey_key" ON "season_onboarding_command"("userId", "operationKey");

ALTER TABLE "living_season_image_run" ADD COLUMN "operationKey" TEXT;
CREATE UNIQUE INDEX "living_season_image_run_userId_operationKey_key" ON "living_season_image_run"("userId", "operationKey");
