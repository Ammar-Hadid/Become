BEGIN;

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "startOn" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "writing" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_edition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "factsFingerprint" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "writing" JSONB NOT NULL,
    "supersedesId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_edition_source" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "review_edition_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_mutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_mutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_transition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStartOn" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "disposition" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "movement" INTEGER NOT NULL DEFAULT 0,
    "completedMovements" INTEGER NOT NULL DEFAULT 0,
    "editionId" TEXT,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_transition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_userId_updatedAt_id_idx" ON "review"("userId", "updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "review_userId_timeframe_startOn_key" ON "review"("userId", "timeframe", "startOn");

-- CreateIndex
CREATE UNIQUE INDEX "review_id_userId_key" ON "review"("id", "userId");

-- CreateIndex
CREATE INDEX "review_edition_reviewId_kind_number_idx" ON "review_edition"("reviewId", "kind", "number");

-- CreateIndex
CREATE UNIQUE INDEX "review_edition_reviewId_number_key" ON "review_edition"("reviewId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "review_edition_id_userId_key" ON "review_edition"("id", "userId");

-- CreateIndex
CREATE INDEX "review_edition_source_editionId_metricKey_occurredAt_key_idx" ON "review_edition_source"("editionId", "metricKey", "occurredAt", "key");

-- CreateIndex
CREATE UNIQUE INDEX "review_edition_source_editionId_key_key" ON "review_edition_source"("editionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "review_mutation_userId_operationKey_key" ON "review_mutation"("userId", "operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "season_transition_userId_fromStartOn_key" ON "season_transition"("userId", "fromStartOn");

-- CreateIndex
CREATE UNIQUE INDEX "season_transition_id_userId_key" ON "season_transition"("id", "userId");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_edition" ADD CONSTRAINT "review_edition_reviewId_userId_fkey" FOREIGN KEY ("reviewId", "userId") REFERENCES "review"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_edition" ADD CONSTRAINT "review_edition_supersedesId_userId_fkey" FOREIGN KEY ("supersedesId", "userId") REFERENCES "review_edition"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_edition_source" ADD CONSTRAINT "review_edition_source_editionId_userId_fkey" FOREIGN KEY ("editionId", "userId") REFERENCES "review_edition"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_mutation" ADD CONSTRAINT "review_mutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_transition" ADD CONSTRAINT "season_transition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_transition" ADD CONSTRAINT "season_transition_editionId_userId_fkey" FOREIGN KEY ("editionId", "userId") REFERENCES "review_edition"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;


-- Historical snapshots are intentionally untouched. Active JSON loses the deprecated input only.
UPDATE "user_season" SET character = character - 'tone' WHERE jsonb_typeof(character)='object' AND character ? 'tone';
ALTER TABLE review ADD CONSTRAINT review_period_kind CHECK (timeframe IN ('week','month','season','year'));
ALTER TABLE review_edition ADD CONSTRAINT review_edition_kind CHECK (kind IN ('PRESENTATION','FINALIZED','AMENDMENT'));
CREATE UNIQUE INDEX review_one_presentation ON review_edition("reviewId") WHERE kind='PRESENTATION';
ALTER TABLE season_transition ADD CONSTRAINT transition_disposition CHECK (disposition IN ('AVAILABLE','IN_PROGRESS','DEFERRED','SKIPPED','COMPLETED'));
ALTER TABLE season_transition ADD CONSTRAINT transition_progress CHECK (movement BETWEEN 0 AND 3 AND "completedMovements" BETWEEN 0 AND 4);
COMMIT;
