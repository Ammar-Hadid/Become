-- CreateTable
CREATE TABLE "interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_revision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "companyId" TEXT,
    "nicheId" TEXT,
    "companySnapshot" TEXT,
    "nicheSnapshot" TEXT,
    "respondsToInteractionId" TEXT,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "datePrecision" TEXT NOT NULL DEFAULT 'DAY',
    "summary" TEXT NOT NULL,
    "notes" TEXT,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "correctionReason" TEXT,
    "materialChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_revision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "wordingMode" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "nicheId" TEXT,
    "companySnapshot" TEXT,
    "nicheSnapshot" TEXT,
    "sourceKind" TEXT NOT NULL,
    "interactionId" TEXT,
    "interactionRevisionId" TEXT,
    "sourceUrl" TEXT,
    "sourceDescription" TEXT NOT NULL,
    "correctionReason" TEXT,
    "materialChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "initialStatement" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "formulatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nicheId" TEXT,
    "nicheSnapshot" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_evidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "observationId" TEXT,
    "observationRevisionId" TEXT,
    "stance" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_assessment_evidence" (
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "problem_assessment_evidence_pkey" PRIMARY KEY ("assessmentId","evidenceId")
);

-- CreateTable
CREATE TABLE "follow_up" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "interactionId" TEXT,
    "title" TEXT NOT NULL,
    "dueOn" DATE,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interaction_userId_createdAt_id_idx" ON "interaction"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_id_userId_key" ON "interaction"("id", "userId");

-- CreateIndex
CREATE INDEX "interaction_revision_userId_occurredAt_id_idx" ON "interaction_revision"("userId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "interaction_revision_companyId_occurredAt_idx" ON "interaction_revision"("companyId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_revision_interactionId_version_key" ON "interaction_revision"("interactionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_revision_id_interactionId_userId_key" ON "interaction_revision"("id", "interactionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_revision_id_userId_key" ON "interaction_revision"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "observation_id_userId_key" ON "observation"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "observation_revision_observationId_version_key" ON "observation_revision"("observationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "observation_revision_id_observationId_userId_key" ON "observation_revision"("id", "observationId", "userId");

-- CreateIndex
CREATE INDEX "problem_userId_createdAt_id_idx" ON "problem"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "problem_id_userId_key" ON "problem"("id", "userId");

-- CreateIndex
CREATE INDEX "problem_evidence_problemId_withdrawnAt_idx" ON "problem_evidence"("problemId", "withdrawnAt");

-- CreateIndex
CREATE UNIQUE INDEX "problem_evidence_id_problemId_userId_key" ON "problem_evidence"("id", "problemId", "userId");

-- CreateIndex
CREATE INDEX "problem_assessment_problemId_assessedAt_idx" ON "problem_assessment"("problemId", "assessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "problem_assessment_id_problemId_userId_key" ON "problem_assessment"("id", "problemId", "userId");

-- CreateIndex
CREATE INDEX "follow_up_userId_dueOn_completedAt_idx" ON "follow_up"("userId", "dueOn", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_id_userId_key" ON "follow_up"("id", "userId");

-- AddForeignKey
ALTER TABLE "interaction" ADD CONSTRAINT "interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_interactionId_userId_fkey" FOREIGN KEY ("interactionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_revision" ADD CONSTRAINT "interaction_revision_respondsToInteractionId_userId_fkey" FOREIGN KEY ("respondsToInteractionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation" ADD CONSTRAINT "observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_observationId_userId_fkey" FOREIGN KEY ("observationId", "userId") REFERENCES "observation"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_revision" ADD CONSTRAINT "observation_revision_interactionRevisionId_interactionId_u_fkey" FOREIGN KEY ("interactionRevisionId", "interactionId", "userId") REFERENCES "interaction_revision"("id", "interactionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_evidence" ADD CONSTRAINT "problem_evidence_problemId_userId_fkey" FOREIGN KEY ("problemId", "userId") REFERENCES "problem"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_evidence" ADD CONSTRAINT "problem_evidence_observationId_userId_fkey" FOREIGN KEY ("observationId", "userId") REFERENCES "observation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_evidence" ADD CONSTRAINT "problem_evidence_observationRevisionId_observationId_userI_fkey" FOREIGN KEY ("observationRevisionId", "observationId", "userId") REFERENCES "observation_revision"("id", "observationId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_assessment" ADD CONSTRAINT "problem_assessment_problemId_userId_fkey" FOREIGN KEY ("problemId", "userId") REFERENCES "problem"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_assessment_evidence" ADD CONSTRAINT "problem_assessment_evidence_assessmentId_problemId_userId_fkey" FOREIGN KEY ("assessmentId", "problemId", "userId") REFERENCES "problem_assessment"("id", "problemId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_assessment_evidence" ADD CONSTRAINT "problem_assessment_evidence_evidenceId_problemId_userId_fkey" FOREIGN KEY ("evidenceId", "problemId", "userId") REFERENCES "problem_evidence"("id", "problemId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_interactionId_userId_fkey" FOREIGN KEY ("interactionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Logical evidence identity remains stable across factual corrections.
CREATE UNIQUE INDEX problem_active_observation_evidence ON problem_evidence ("problemId", "observationId") WHERE "withdrawnAt" IS NULL AND "observationId" IS NOT NULL;
ALTER TABLE problem_evidence ADD CONSTRAINT evidence_observation_pair CHECK (("observationId" IS NULL) = ("observationRevisionId" IS NULL));
ALTER TABLE interaction_revision ADD CONSTRAINT interaction_no_self_reply CHECK ("respondsToInteractionId" IS NULL OR "respondsToInteractionId" <> "interactionId");
ALTER TABLE observation_revision ADD CONSTRAINT observation_source_shape CHECK (
 ("sourceKind" = 'INTERACTION' AND "interactionId" IS NOT NULL AND "interactionRevisionId" IS NOT NULL AND "sourceUrl" IS NULL) OR
 ("sourceKind" = 'DIRECT_OBSERVATION' AND "interactionId" IS NULL AND "interactionRevisionId" IS NULL AND "sourceUrl" IS NULL) OR
 ("sourceKind" = 'PUBLIC_SOURCE' AND "interactionId" IS NULL AND "interactionRevisionId" IS NULL AND "sourceUrl" IS NOT NULL)
);
ALTER TABLE follow_up ADD CONSTRAINT follow_up_one_target CHECK (num_nonnulls("companyId", "interactionId") = 1);
ALTER TABLE follow_up ADD CONSTRAINT follow_up_one_resolution CHECK (NOT ("completedAt" IS NOT NULL AND "cancelledAt" IS NOT NULL));
