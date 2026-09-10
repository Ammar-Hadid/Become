-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "FinancialInflowKind" AS ENUM ('EARNED_WORK', 'BUSINESS_REVENUE', 'STUDENT_FINANCE', 'GIFT', 'REFUND', 'REIMBURSEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "inflowKind" "FinancialInflowKind",
    "expenseCategoryId" TEXT,
    "counterparty" VARCHAR(120),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_id_userId_key" ON "expense_category"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_userId_normalizedName_key" ON "expense_category"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_occurredAt_id_idx" ON "financial_transaction"("userId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_accountId_occurredAt_idx" ON "financial_transaction"("userId", "accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "financial_transaction_userId_destinationAccountId_occurredA_idx" ON "financial_transaction"("userId", "destinationAccountId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transaction_id_userId_key" ON "financial_transaction"("id", "userId");

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_destinationAccountId_userId_fkey" FOREIGN KEY ("destinationAccountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_expenseCategoryId_userId_fkey" FOREIGN KEY ("expenseCategoryId", "userId") REFERENCES "expense_category"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_currency_valid" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_shape" CHECK (
  ("type" = 'INCOME' AND "inflowKind" IS NOT NULL AND "destinationAccountId" IS NULL AND "expenseCategoryId" IS NULL)
  OR ("type" = 'EXPENSE' AND "inflowKind" IS NULL AND "destinationAccountId" IS NULL)
  OR ("type" = 'TRANSFER' AND "destinationAccountId" IS NOT NULL AND "destinationAccountId" <> "accountId" AND "inflowKind" IS NULL AND "expenseCategoryId" IS NULL)
);
