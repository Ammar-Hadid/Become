-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'DIGITAL_WALLET', 'OTHER');

-- CreateTable
CREATE TABLE "financial_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "includeInLiquidSavings" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_account_balance_snapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balanceMinor" BIGINT NOT NULL,
    "reconciledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_account_balance_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_account_userId_archivedAt_idx" ON "financial_account"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_id_userId_key" ON "financial_account"("id", "userId");

-- CreateIndex
CREATE INDEX "financial_account_balance_snapshot_userId_accountId_reconci_idx" ON "financial_account_balance_snapshot"("userId", "accountId", "reconciledAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_balance_snapshot_accountId_reconciledAt_key" ON "financial_account_balance_snapshot"("accountId", "reconciledAt");

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_balance_snapshot" ADD CONSTRAINT "financial_account_balance_snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_balance_snapshot" ADD CONSTRAINT "financial_account_balance_snapshot_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

