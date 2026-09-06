-- CreateEnum
CREATE TYPE "FinanceCompensationType" AS ENUM ('HOURLY', 'FIXED', 'TASK_BASED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WorkSourceType" AS ENUM ('EMPLOYER', 'CLIENT', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeOpportunityStatus" AS ENUM ('DISCOVERED', 'APPLIED', 'ASSESSMENT', 'ACCEPTED', 'REJECTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "IncomeOpportunityChannel" AS ENUM ('DIRECT', 'REFERRAL', 'JOB_BOARD', 'MARKETPLACE', 'OUTREACH', 'OTHER');

-- AlterTable
ALTER TABLE "financial_transaction" ADD COLUMN     "incomeOpportunityId" TEXT,
ADD COLUMN     "workSourceId" TEXT;

-- CreateTable
CREATE TABLE "work_source" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "WorkSourceType" NOT NULL,
    "defaultCompensationType" "FinanceCompensationType" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_opportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "organizationName" VARCHAR(120),
    "status" "IncomeOpportunityStatus" NOT NULL DEFAULT 'DISCOVERED',
    "channel" "IncomeOpportunityChannel",
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "assessmentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resultingWorkSourceId" TEXT,
    "compensationType" "FinanceCompensationType",
    "expectedAmountMinor" BIGINT,
    "expectedCurrency" VARCHAR(3),
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_source_userId_archivedAt_idx" ON "work_source"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_source_id_userId_key" ON "work_source"("id", "userId");

-- CreateIndex
CREATE INDEX "income_opportunity_userId_archivedAt_discoveredAt_idx" ON "income_opportunity"("userId", "archivedAt", "discoveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "income_opportunity_id_userId_key" ON "income_opportunity"("id", "userId");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_workSourceId_occurredAt_idx" ON "financial_transaction"("userId", "workSourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_incomeOpportunityId_occurredAt_idx" ON "financial_transaction"("userId", "incomeOpportunityId", "occurredAt");

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_workSourceId_userId_fkey" FOREIGN KEY ("workSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_incomeOpportunityId_userId_fkey" FOREIGN KEY ("incomeOpportunityId", "userId") REFERENCES "income_opportunity"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_source" ADD CONSTRAINT "work_source_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_opportunity" ADD CONSTRAINT "income_opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_opportunity" ADD CONSTRAINT "income_opportunity_resultingWorkSourceId_userId_fkey" FOREIGN KEY ("resultingWorkSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE income_opportunity ADD CONSTRAINT opportunity_expectation_pair CHECK (("expectedAmountMinor" IS NULL) = ("expectedCurrency" IS NULL) AND ("expectedAmountMinor" IS NULL OR "expectedAmountMinor" >= 0));
