ALTER TABLE "user" ADD COLUMN "timerRevision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "session_pause" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "session_pause_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_pause_duration_nonnegative" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt"),
  CONSTRAINT "session_pause_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "session_pause_sessionId_startedAt_idx" ON "session_pause"("sessionId", "startedAt");
CREATE UNIQUE INDEX "session_pause_one_open" ON "session_pause"("sessionId") WHERE "endedAt" IS NULL;
-- Keep session_one_active_per_user unchanged: paused sessions remain unfinished.
