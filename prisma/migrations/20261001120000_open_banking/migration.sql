-- CreateEnum
CREATE TYPE "FinancialDataSource" AS ENUM ('LIVE_SYNC', 'STATEMENT_IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "CreditCardRepaymentMethod" AS ENUM ('LINKED_ACCOUNT', 'MANUAL');

-- CreateEnum
CREATE TYPE "BankingConnectionStatus" AS ENUM ('AUTHORIZING', 'CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankSyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BankSyncTrigger" AS ENUM ('INITIAL', 'SCHEDULED', 'USER');

-- CreateEnum
CREATE TYPE "FinancialBookingStatus" AS ENUM ('PENDING', 'BOOKED');

-- CreateEnum
CREATE TYPE "FinancialMovementDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FinancialDatePrecision" AS ENUM ('DATE', 'INSTANT');

-- CreateEnum
CREATE TYPE "FinancialEvidenceStatus" AS ENUM ('STAGED', 'PROJECTED', 'DUPLICATE_REVIEW', 'SUPERSEDED', 'IGNORED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinancialAccountType" ADD VALUE 'CREDIT_CARD';
ALTER TYPE "FinancialAccountType" ADD VALUE 'INVESTMENT';

-- AlterTable
ALTER TABLE "financial_account" ADD COLUMN     "creditLimitMinor" BIGINT,
ADD COLUMN     "dataSource" "FinancialDataSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "repaymentMethod" "CreditCardRepaymentMethod",
ADD COLUMN     "settlementAccountId" TEXT,
ADD COLUMN     "settlementDay" INTEGER,
ADD COLUMN     "statementBalanceMinor" BIGINT,
ADD COLUMN     "statementDueMinor" BIGINT,
ADD COLUMN     "statementDueOn" VARCHAR(10);

-- AlterTable
ALTER TABLE "financial_transaction" ADD COLUMN     "activityOn" VARCHAR(10),
ADD COLUMN     "dataSource" "FinancialDataSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "refundOfId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "savings_goal" ADD COLUMN     "accountId" TEXT;

-- CreateTable
CREATE TABLE "bank_connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "institutionName" VARCHAR(160) NOT NULL,
    "institutionCountry" VARCHAR(2) NOT NULL,
    "institutionLogo" TEXT,
    "status" "BankingConnectionStatus" NOT NULL DEFAULT 'AUTHORIZING',
    "sessionId" TEXT,
    "consentExpiresAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "nextEligibleAt" TIMESTAMP(3),
    "authorizationStateHash" TEXT,
    "authorizationExpiresAt" TIMESTAMP(3),
    "authorizationConsumedAt" TIMESTAMP(3),
    "requiredPsuHeaders" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_bank_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "identityKey" TEXT NOT NULL,
    "identityAliases" JSONB,
    "providerAccountId" TEXT NOT NULL,
    "externalType" TEXT,
    "currency" VARCHAR(3) NOT NULL,
    "maskedIdentifier" TEXT,
    "financialAccountId" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sync_job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "status" "BankSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "BankSyncTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "cursor" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leasedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_sync_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_statement_import" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fileName" VARCHAR(180) NOT NULL,
    "fileHash" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "coverageFromOn" VARCHAR(10),
    "coverageThroughOn" VARCHAR(10),
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_statement_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_evidence_observation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "externalAccountId" TEXT,
    "importId" TEXT,
    "source" "FinancialDataSource" NOT NULL,
    "evidenceKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "externalReference" TEXT,
    "fingerprint" TEXT NOT NULL,
    "bookingStatus" "FinancialBookingStatus" NOT NULL,
    "direction" "FinancialMovementDirection" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "activityOn" VARCHAR(10) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "datePrecision" "FinancialDatePrecision" NOT NULL DEFAULT 'DATE',
    "bookingOn" VARCHAR(10),
    "valueOn" VARCHAR(10),
    "counterpartyName" TEXT,
    "counterpartyIdentity" TEXT,
    "ownCounterpartyIdentity" TEXT,
    "description" TEXT,
    "raw" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_evidence_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_evidence_link" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "accountId" TEXT,
    "transactionId" TEXT,
    "status" "FinancialEvidenceStatus" NOT NULL DEFAULT 'STAGED',
    "duplicateCandidates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsAttention" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_evidence_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_balance_observation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "externalAccountId" TEXT,
    "source" "FinancialDataSource" NOT NULL,
    "balanceMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "balanceType" TEXT NOT NULL,
    "includesPending" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "raw" JSONB NOT NULL,

    CONSTRAINT "financial_balance_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty_identity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "defaultCategoryId" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counterparty_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_expected_income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "dueOn" VARCHAR(10) NOT NULL,
    "recurrenceFrequency" "RecurringFrequency",
    "anchorDate" VARCHAR(10),
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_expected_income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_connection_authorizationStateHash_key" ON "bank_connection"("authorizationStateHash");

-- CreateIndex
CREATE INDEX "bank_connection_status_nextEligibleAt_idx" ON "bank_connection"("status", "nextEligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_connection_id_userId_key" ON "bank_connection"("id", "userId");

-- CreateIndex
CREATE INDEX "external_bank_account_userId_financialAccountId_idx" ON "external_bank_account"("userId", "financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "external_bank_account_id_userId_key" ON "external_bank_account"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "external_bank_account_userId_provider_identityKey_key" ON "external_bank_account"("userId", "provider", "identityKey");

-- CreateIndex
CREATE INDEX "bank_sync_job_status_nextAttemptAt_idx" ON "bank_sync_job"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_statement_import_id_userId_key" ON "financial_statement_import"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_statement_import_userId_accountId_fileHash_key" ON "financial_statement_import"("userId", "accountId", "fileHash");

-- CreateIndex
CREATE INDEX "financial_evidence_observation_userId_externalAccountId_obs_idx" ON "financial_evidence_observation"("userId", "externalAccountId", "observedAt");

-- CreateIndex
CREATE INDEX "financial_evidence_observation_userId_fingerprint_idx" ON "financial_evidence_observation"("userId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "financial_evidence_observation_id_userId_key" ON "financial_evidence_observation"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_evidence_observation_userId_evidenceKey_payloadHa_key" ON "financial_evidence_observation"("userId", "evidenceKey", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "financial_evidence_link_observationId_key" ON "financial_evidence_link"("observationId");

-- CreateIndex
CREATE INDEX "financial_evidence_link_userId_transactionId_status_idx" ON "financial_evidence_link"("userId", "transactionId", "status");

-- CreateIndex
CREATE INDEX "financial_evidence_link_userId_accountId_status_idx" ON "financial_evidence_link"("userId", "accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_evidence_link_id_userId_key" ON "financial_evidence_link"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_evidence_link_observationId_userId_key" ON "financial_evidence_link"("observationId", "userId");

-- CreateIndex
CREATE INDEX "financial_balance_observation_userId_accountId_observedAt_idx" ON "financial_balance_observation"("userId", "accountId", "observedAt");

-- CreateIndex
CREATE INDEX "financial_balance_observation_userId_externalAccountId_obse_idx" ON "financial_balance_observation"("userId", "externalAccountId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_balance_observation_userId_payloadHash_key" ON "financial_balance_observation"("userId", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "counterparty_identity_userId_identityKey_key" ON "counterparty_identity"("userId", "identityKey");

-- CreateIndex
CREATE INDEX "finance_expected_income_userId_dueOn_idx" ON "finance_expected_income"("userId", "dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "finance_expected_income_id_userId_key" ON "finance_expected_income"("id", "userId");

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_settlementAccountId_userId_currency_fkey" FOREIGN KEY ("settlementAccountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_refundOfId_userId_fkey" FOREIGN KEY ("refundOfId", "userId") REFERENCES "financial_transaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goal" ADD CONSTRAINT "savings_goal_accountId_userId_currency_fkey" FOREIGN KEY ("accountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connection" ADD CONSTRAINT "bank_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_bank_account" ADD CONSTRAINT "external_bank_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_bank_account" ADD CONSTRAINT "external_bank_account_connectionId_userId_fkey" FOREIGN KEY ("connectionId", "userId") REFERENCES "bank_connection"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_bank_account" ADD CONSTRAINT "external_bank_account_financialAccountId_userId_currency_fkey" FOREIGN KEY ("financialAccountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sync_job" ADD CONSTRAINT "bank_sync_job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sync_job" ADD CONSTRAINT "bank_sync_job_connectionId_userId_fkey" FOREIGN KEY ("connectionId", "userId") REFERENCES "bank_connection"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sync_job" ADD CONSTRAINT "bank_sync_job_externalAccountId_userId_fkey" FOREIGN KEY ("externalAccountId", "userId") REFERENCES "external_bank_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_statement_import" ADD CONSTRAINT "financial_statement_import_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_statement_import" ADD CONSTRAINT "financial_statement_import_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_observation" ADD CONSTRAINT "financial_evidence_observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_observation" ADD CONSTRAINT "financial_evidence_observation_accountId_userId_currency_fkey" FOREIGN KEY ("accountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_observation" ADD CONSTRAINT "financial_evidence_observation_externalAccountId_userId_fkey" FOREIGN KEY ("externalAccountId", "userId") REFERENCES "external_bank_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_observation" ADD CONSTRAINT "financial_evidence_observation_importId_userId_fkey" FOREIGN KEY ("importId", "userId") REFERENCES "financial_statement_import"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_link" ADD CONSTRAINT "financial_evidence_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_link" ADD CONSTRAINT "financial_evidence_link_observationId_userId_fkey" FOREIGN KEY ("observationId", "userId") REFERENCES "financial_evidence_observation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_link" ADD CONSTRAINT "financial_evidence_link_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_evidence_link" ADD CONSTRAINT "financial_evidence_link_transactionId_userId_fkey" FOREIGN KEY ("transactionId", "userId") REFERENCES "financial_transaction"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_balance_observation" ADD CONSTRAINT "financial_balance_observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_balance_observation" ADD CONSTRAINT "financial_balance_observation_accountId_userId_currency_fkey" FOREIGN KEY ("accountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_balance_observation" ADD CONSTRAINT "financial_balance_observation_externalAccountId_userId_fkey" FOREIGN KEY ("externalAccountId", "userId") REFERENCES "external_bank_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_identity" ADD CONSTRAINT "counterparty_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_identity" ADD CONSTRAINT "counterparty_identity_counterpartyId_userId_fkey" FOREIGN KEY ("counterpartyId", "userId") REFERENCES "counterparty"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparty_identity" ADD CONSTRAINT "counterparty_identity_defaultCategoryId_userId_fkey" FOREIGN KEY ("defaultCategoryId", "userId") REFERENCES "expense_category"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_expected_income" ADD CONSTRAINT "finance_expected_income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_expected_income" ADD CONSTRAINT "finance_expected_income_accountId_userId_currency_fkey" FOREIGN KEY ("accountId", "userId", "currency") REFERENCES "financial_account"("id", "userId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Imported facts are append-only; interpretation and links remain editable.
CREATE FUNCTION reject_financial_evidence_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Imported financial evidence is immutable'; END $$;
CREATE TRIGGER financial_evidence_immutable BEFORE UPDATE ON financial_evidence_observation FOR EACH ROW EXECUTE FUNCTION reject_financial_evidence_update();
CREATE TRIGGER financial_balance_immutable BEFORE UPDATE ON financial_balance_observation FOR EACH ROW EXECUTE FUNCTION reject_financial_evidence_update();
ALTER TABLE financial_evidence_observation ADD CONSTRAINT evidence_positive_money CHECK ("amountMinor" > 0);
ALTER TABLE finance_expected_income ADD CONSTRAINT expected_income_positive_money CHECK ("amountMinor" > 0);
ALTER TABLE financial_account ADD CONSTRAINT card_settlement_required CHECK (type <> 'CREDIT_CARD' OR "repaymentMethod" IS NOT NULL AND ("repaymentMethod" <> 'LINKED_ACCOUNT' OR "settlementAccountId" IS NOT NULL));
ALTER TABLE financial_account ADD CONSTRAINT settlement_not_self CHECK ("settlementAccountId" IS NULL OR "settlementAccountId" <> id);
ALTER TABLE financial_account ADD CONSTRAINT credit_limit_nonnegative CHECK ("creditLimitMinor" IS NULL OR "creditLimitMinor" >= 0);
ALTER TABLE financial_account ADD CONSTRAINT settlement_day_range CHECK ("settlementDay" IS NULL OR "settlementDay" BETWEEN 1 AND 31);
CREATE UNIQUE INDEX bank_sync_one_active_account_job ON bank_sync_job ("externalAccountId") WHERE status IN ('QUEUED','RUNNING') AND "externalAccountId" IS NOT NULL;

CREATE UNIQUE INDEX bank_sync_one_running_connection ON bank_sync_job ("connectionId") WHERE status='RUNNING';

ALTER TABLE external_bank_account ADD COLUMN "authorizedSessionId" TEXT;
