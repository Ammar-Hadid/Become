-- CreateTable
CREATE TABLE "user_season" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL DEFAULT '',
    "intention" TEXT NOT NULL DEFAULT '',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "character" JSONB NOT NULL DEFAULT '{}',
    "stage" INTEGER NOT NULL DEFAULT 1,
    "openingCompletedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    "closingSnapshot" JSONB,
    "readyForReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_goal" (
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "season_goal_pkey" PRIMARY KEY ("seasonId","goalId")
);

-- CreateTable
CREATE TABLE "season_milestone" (
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_milestone_pkey" PRIMARY KEY ("seasonId","key")
);

-- CreateTable
CREATE TABLE "season_media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "alt" TEXT NOT NULL,
    "decorative" BOOLEAN NOT NULL DEFAULT false,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "poster" BOOLEAN NOT NULL DEFAULT false,
    "provenance" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "provenance" JSONB NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startOn" DATE NOT NULL,
    "targetOn" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "criterionMode" TEXT NOT NULL DEFAULT 'ALL',
    "outcome" TEXT,
    "conclusion" TEXT,
    "concludedAt" TIMESTAMP(3),
    "conclusionSnapshot" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direction_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_domain" (
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "goal_domain_pkey" PRIMARY KEY ("goalId","domainId")
);

-- CreateTable
CREATE TABLE "goal_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "startOn" DATE NOT NULL,
    "targetOn" DATE,
    "stoppingCondition" TEXT NOT NULL DEFAULT '',
    "expectedEvidence" TEXT NOT NULL DEFAULT '',
    "goalId" TEXT,
    "repeatedFromId" TEXT,
    "criterionMode" TEXT NOT NULL DEFAULT 'ALL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "outcome" TEXT,
    "result" TEXT,
    "learning" TEXT,
    "concludedAt" TIMESTAMP(3),
    "conclusionSnapshot" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_domain" (
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "experiment_domain_pkey" PRIMARY KEY ("experimentId","domainId")
);

-- CreateTable
CREATE TABLE "experiment_source" (
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,

    CONSTRAINT "experiment_source_pkey" PRIMARY KEY ("experimentId","interactionId")
);

-- CreateTable
CREATE TABLE "experiment_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_criterion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "experimentId" TEXT,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metric" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "targetMinor" BIGINT,
    "currency" TEXT,
    "startOn" DATE,
    "endOn" DATE,
    "workSourceId" TEXT,
    "companyId" TEXT,
    "offerRevisionId" TEXT,
    "nicheId" TEXT,
    "projectId" TEXT,
    "domainId" TEXT,
    "activityTypeId" TEXT,
    "savingsGoalId" TEXT,
    "evidenceType" TEXT,
    "minimumReceived" TEXT,
    "minimumReceivedMinor" BIGINT,
    "baselineAssertions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "direction_criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion_assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "value" TEXT,
    "confirmed" BOOLEAN NOT NULL,
    "rationale" TEXT NOT NULL,
    "sourceReferences" JSONB NOT NULL DEFAULT '[]',
    "assessedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criterion_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_season_userId_year_quarter_key" ON "user_season"("userId", "year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "user_season_id_userId_key" ON "user_season"("id", "userId");

-- CreateIndex
CREATE INDEX "season_goal_userId_goalId_idx" ON "season_goal"("userId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "season_media_storageKey_key" ON "season_media"("storageKey");

-- CreateIndex
CREATE INDEX "season_media_userId_seasonId_retiredAt_idx" ON "season_media"("userId", "seasonId", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "season_media_id_userId_key" ON "season_media"("id", "userId");

-- CreateIndex
CREATE INDEX "season_quote_userId_seasonId_retiredAt_idx" ON "season_quote"("userId", "seasonId", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "season_quote_id_userId_key" ON "season_quote"("id", "userId");

-- CreateIndex
CREATE INDEX "season_change_seasonId_createdAt_idx" ON "season_change"("seasonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "season_change_userId_operationKey_key" ON "season_change"("userId", "operationKey");

-- CreateIndex
CREATE INDEX "direction_goal_userId_archivedAt_status_createdAt_id_idx" ON "direction_goal"("userId", "archivedAt", "status", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "direction_goal_id_userId_key" ON "direction_goal"("id", "userId");

-- CreateIndex
CREATE INDEX "goal_change_goalId_createdAt_idx" ON "goal_change"("goalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "goal_change_userId_operationKey_key" ON "goal_change"("userId", "operationKey");

-- CreateIndex
CREATE INDEX "experiment_userId_archivedAt_status_createdAt_id_idx" ON "experiment"("userId", "archivedAt", "status", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_id_userId_key" ON "experiment"("id", "userId");

-- CreateIndex
CREATE INDEX "experiment_change_experimentId_createdAt_idx" ON "experiment_change"("experimentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_change_userId_operationKey_key" ON "experiment_change"("userId", "operationKey");

-- CreateIndex
CREATE INDEX "direction_criterion_userId_goalId_idx" ON "direction_criterion"("userId", "goalId");

-- CreateIndex
CREATE INDEX "direction_criterion_userId_experimentId_idx" ON "direction_criterion"("userId", "experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_criterion_id_userId_key" ON "direction_criterion"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_criterion_goalId_key_key" ON "direction_criterion"("goalId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "direction_criterion_experimentId_key_key" ON "direction_criterion"("experimentId", "key");

-- CreateIndex
CREATE INDEX "criterion_assessment_criterionId_createdAt_idx" ON "criterion_assessment"("criterionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "criterion_assessment_userId_operationKey_key" ON "criterion_assessment"("userId", "operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "offer_revision_id_userId_key" ON "offer_revision"("id", "userId");

-- AddForeignKey
ALTER TABLE "user_season" ADD CONSTRAINT "user_season_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_goal" ADD CONSTRAINT "season_goal_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_goal" ADD CONSTRAINT "season_goal_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_milestone" ADD CONSTRAINT "season_milestone_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_media" ADD CONSTRAINT "season_media_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_quote" ADD CONSTRAINT "season_quote_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_change" ADD CONSTRAINT "season_change_seasonId_userId_fkey" FOREIGN KEY ("seasonId", "userId") REFERENCES "user_season"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_goal" ADD CONSTRAINT "direction_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_domain" ADD CONSTRAINT "goal_domain_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_domain" ADD CONSTRAINT "goal_domain_domainId_userId_fkey" FOREIGN KEY ("domainId", "userId") REFERENCES "domain"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_change" ADD CONSTRAINT "goal_change_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_repeatedFromId_userId_fkey" FOREIGN KEY ("repeatedFromId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_domain" ADD CONSTRAINT "experiment_domain_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_domain" ADD CONSTRAINT "experiment_domain_domainId_userId_fkey" FOREIGN KEY ("domainId", "userId") REFERENCES "domain"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_source" ADD CONSTRAINT "experiment_source_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_source" ADD CONSTRAINT "experiment_source_interactionId_userId_fkey" FOREIGN KEY ("interactionId", "userId") REFERENCES "interaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_change" ADD CONSTRAINT "experiment_change_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "direction_goal"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_experimentId_userId_fkey" FOREIGN KEY ("experimentId", "userId") REFERENCES "experiment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_workSourceId_userId_fkey" FOREIGN KEY ("workSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_offerRevisionId_userId_fkey" FOREIGN KEY ("offerRevisionId", "userId") REFERENCES "offer_revision"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_nicheId_userId_fkey" FOREIGN KEY ("nicheId", "userId") REFERENCES "niche"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "engineering_project"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_domainId_userId_fkey" FOREIGN KEY ("domainId", "userId") REFERENCES "domain"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_activityTypeId_domainId_fkey" FOREIGN KEY ("activityTypeId", "domainId") REFERENCES "activity_type"("id", "domainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direction_criterion" ADD CONSTRAINT "direction_criterion_savingsGoalId_userId_fkey" FOREIGN KEY ("savingsGoalId", "userId") REFERENCES "savings_goal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_assessment" ADD CONSTRAINT "criterion_assessment_criterionId_userId_fkey" FOREIGN KEY ("criterionId", "userId") REFERENCES "direction_criterion"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Direction constraints supplement Prisma's owned composite foreign keys.
ALTER TABLE user_season ADD CONSTRAINT season_calendar_shape CHECK (quarter BETWEEN 1 AND 4 AND year BETWEEN 1900 AND 2200 AND stage BETWEEN 1 AND 4);
ALTER TABLE season_goal ADD CONSTRAINT seasonal_role_valid CHECK (role IN ('PRIMARY','SUPPORTING'));
CREATE UNIQUE INDEX season_one_primary ON season_goal ("seasonId") WHERE role='PRIMARY';
CREATE UNIQUE INDEX season_one_poster ON season_media ("seasonId") WHERE poster AND "retiredAt" IS NULL;
CREATE UNIQUE INDEX season_one_quote ON season_quote ("seasonId") WHERE featured AND "retiredAt" IS NULL;
ALTER TABLE season_media ADD CONSTRAINT season_media_shape CHECK ("byteSize">0 AND width>0 AND height>0 AND "focalX" BETWEEN 0 AND 1 AND "focalY" BETWEEN 0 AND 1 AND "storageKey" ~ '^media/seasons/[a-zA-Z0-9-]+/[a-zA-Z0-9-]+[.]webp$');
ALTER TABLE season_quote ADD CONSTRAINT season_quote_kind CHECK (kind IN ('EXACT','PARAPHRASE','UNKNOWN'));
ALTER TABLE direction_goal ADD CONSTRAINT goal_dates CHECK ("targetOn" IS NULL OR "targetOn">="startOn");
ALTER TABLE direction_goal ADD CONSTRAINT goal_lifecycle CHECK (status IN ('ACTIVE','PAUSED','CONCLUDED') AND "criterionMode" IN ('ALL','ANY') AND (outcome IS NULL OR outcome IN ('ACHIEVED','PARTIAL','STOPPED')) AND ((status='CONCLUDED')=("concludedAt" IS NOT NULL)));
ALTER TABLE experiment ADD CONSTRAINT experiment_dates CHECK ("targetOn" IS NULL OR "targetOn">="startOn");
ALTER TABLE experiment ADD CONSTRAINT experiment_lifecycle CHECK (status IN ('ACTIVE','PAUSED','CONCLUDED') AND "criterionMode" IN ('ALL','ANY') AND (outcome IS NULL OR outcome IN ('SUPPORTED','NOT_SUPPORTED','INCONCLUSIVE')) AND ((status='CONCLUDED')=("concludedAt" IS NOT NULL)));
ALTER TABLE experiment ADD CONSTRAINT experiment_no_self_repeat CHECK ("repeatedFromId" IS NULL OR "repeatedFromId"<>id);
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_one_owner CHECK (num_nonnulls("goalId","experimentId")=1);
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_dates CHECK ("startOn" IS NULL OR "endOn" IS NULL OR "endOn">="startOn");
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_metric CHECK (metric IN ('MANUAL','WORK_SOURCE_INCOME','BUSINESS_RECEIPTS','NEW_RECURRING_COMPANY','CONVERSATIONS','CONVERSATION_COMPANIES','SESSION_TIME','ENGINEERING_EVIDENCE','SAVINGS_GOAL'));
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_money CHECK ((metric IN ('WORK_SOURCE_INCOME','BUSINESS_RECEIPTS','NEW_RECURRING_COMPANY') AND "targetMinor">0 AND currency ~ '^[A-Z]{3}$') OR (metric NOT IN ('WORK_SOURCE_INCOME','BUSINESS_RECEIPTS','NEW_RECURRING_COMPANY') AND "targetMinor" IS NULL));
ALTER TABLE direction_criterion ADD CONSTRAINT criterion_scoped CHECK ((metric<>'WORK_SOURCE_INCOME' OR "workSourceId" IS NOT NULL) AND (metric<>'BUSINESS_RECEIPTS' OR "companyId" IS NOT NULL) AND (metric<>'SAVINGS_GOAL' OR "savingsGoalId" IS NOT NULL) AND ("activityTypeId" IS NULL OR "domainId" IS NOT NULL));
CREATE INDEX direction_interaction_scope ON interaction_revision ("userId","nicheId",kind,"occurredAt","interactionId");
CREATE INDEX direction_receipt_revision ON business_receipt_allocation ("userId","offerRevisionId","withdrawnAt");
