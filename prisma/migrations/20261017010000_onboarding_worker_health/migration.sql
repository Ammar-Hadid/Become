CREATE TABLE "SeasonOnboardingWorker" (
    "id" TEXT NOT NULL,
    "heartbeatAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeasonOnboardingWorker_pkey" PRIMARY KEY ("id")
);
