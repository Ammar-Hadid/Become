-- AlterTable
ALTER TABLE "problem_evidence" ADD COLUMN     "receiptAllocationId" TEXT;

-- AlterTable
ALTER TABLE "follow_up" ADD COLUMN     "offerId" TEXT;

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "continuationChoice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_revision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "terms" TEXT,
    "companySnapshot" TEXT NOT NULL,
    "priceBasis" TEXT NOT NULL,
    "priceMinor" BIGINT,
    "currency" TEXT,
    "unitLabel" TEXT,
    "intervalUnit" TEXT,
    "intervalCount" INTEGER,
    "expiresOn" DATE,
    "proposedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_revision_problem" (
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "offerRevisionId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "offer_revision_problem_pkey" PRIMARY KEY ("offerRevisionId","problemId")
);

-- CreateTable
CREATE TABLE "offer_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "offerRevisionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "interactionId" TEXT,
    "interactionRevisionId" TEXT,
    "retractedAt" TIMESTAMP(3),
    "retractionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_work_source" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workSourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_work_source_pkey" PRIMARY KEY ("companyId","workSourceId")
);

-- CreateTable
CREATE TABLE "business_receipt_allocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "originalTransactionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "offerRevisionId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currencySnapshot" TEXT NOT NULL,
    "occurredAtSnapshot" TIMESTAMP(3) NOT NULL,
    "companySnapshot" TEXT NOT NULL,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needsReviewAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_receipt_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_userId_createdAt_id_idx" ON "offer"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_id_userId_key" ON "offer"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_id_companyId_userId_key" ON "offer"("id", "companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_revision_offerId_version_key" ON "offer_revision"("offerId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "offer_revision_id_offerId_userId_key" ON "offer_revision"("id", "offerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_revision_id_companyId_userId_key" ON "offer_revision"("id", "companyId", "userId");

-- CreateIndex
CREATE INDEX "offer_event_offerId_occurredAt_idx" ON "offer_event"("offerId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "offer_event_id_userId_key" ON "offer_event"("id", "userId");

-- CreateIndex
CREATE INDEX "business_receipt_allocation_transactionId_withdrawnAt_idx" ON "business_receipt_allocation"("transactionId", "withdrawnAt");

-- CreateIndex
CREATE INDEX "business_receipt_allocation_userId_companyId_withdrawnAt_idx" ON "business_receipt_allocation"("userId", "companyId", "withdrawnAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_receipt_allocation_id_userId_key" ON "business_receipt_allocation"("id", "userId");

-- AddForeignKey
ALTER TABLE "problem_evidence" ADD CONSTRAINT "problem_evidence_receiptAllocationId_userId_fkey" FOREIGN KEY ("receiptAllocationId", "userId") REFERENCES "business_receipt_allocation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_offerId_userId_fkey" FOREIGN KEY ("offerId", "userId") REFERENCES "offer"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision" ADD CONSTRAINT "offer_revision_offerId_companyId_userId_fkey" FOREIGN KEY ("offerId", "companyId", "userId") REFERENCES "offer"("id", "companyId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision_problem" ADD CONSTRAINT "offer_revision_problem_offerRevisionId_offerId_userId_fkey" FOREIGN KEY ("offerRevisionId", "offerId", "userId") REFERENCES "offer_revision"("id", "offerId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_revision_problem" ADD CONSTRAINT "offer_revision_problem_problemId_userId_fkey" FOREIGN KEY ("problemId", "userId") REFERENCES "problem"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_event" ADD CONSTRAINT "offer_event_offerId_userId_fkey" FOREIGN KEY ("offerId", "userId") REFERENCES "offer"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_event" ADD CONSTRAINT "offer_event_offerRevisionId_offerId_userId_fkey" FOREIGN KEY ("offerRevisionId", "offerId", "userId") REFERENCES "offer_revision"("id", "offerId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_event" ADD CONSTRAINT "offer_event_interactionRevisionId_interactionId_userId_fkey" FOREIGN KEY ("interactionRevisionId", "interactionId", "userId") REFERENCES "interaction_revision"("id", "interactionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_work_source" ADD CONSTRAINT "company_work_source_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_work_source" ADD CONSTRAINT "company_work_source_workSourceId_userId_fkey" FOREIGN KEY ("workSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_transactionId_userId_fkey" FOREIGN KEY ("transactionId", "userId") REFERENCES "financial_transaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_receipt_allocation" ADD CONSTRAINT "business_receipt_allocation_offerRevisionId_companyId_user_fkey" FOREIGN KEY ("offerRevisionId", "companyId", "userId") REFERENCES "offer_revision"("id", "companyId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE offer_revision ADD CONSTRAINT offer_money_shape CHECK (("priceMinor" IS NULL) = (currency IS NULL) AND ("priceMinor" IS NULL OR "priceMinor" >= 0));
ALTER TABLE offer_revision ADD CONSTRAINT offer_interval_shape CHECK (("priceBasis" = 'RECURRING' AND "intervalUnit" IN ('DAY','WEEK','MONTH','YEAR') AND "intervalCount" > 0) OR ("priceBasis" <> 'RECURRING' AND "intervalUnit" IS NULL AND "intervalCount" IS NULL));
ALTER TABLE business_receipt_allocation ADD CONSTRAINT business_receipt_positive CHECK ("amountMinor" > 0);
ALTER TABLE business_receipt_allocation ADD CONSTRAINT business_receipt_live_source CHECK ("transactionId" IS NOT NULL OR "withdrawnAt" IS NOT NULL);
ALTER TABLE problem_evidence ADD CONSTRAINT evidence_one_source CHECK (num_nonnulls("observationRevisionId", "receiptAllocationId") = 1);
CREATE UNIQUE INDEX problem_active_receipt_evidence ON problem_evidence ("problemId", "receiptAllocationId") WHERE "withdrawnAt" IS NULL AND "receiptAllocationId" IS NOT NULL;
ALTER TABLE follow_up DROP CONSTRAINT follow_up_one_target;
ALTER TABLE follow_up ADD CONSTRAINT follow_up_one_target CHECK (num_nonnulls("companyId", "interactionId", "offerId") = 1);
