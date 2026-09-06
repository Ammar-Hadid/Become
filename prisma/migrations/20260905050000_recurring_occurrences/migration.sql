-- CreateEnum
CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('AWAITING_CONFIRMATION', 'POSTED_AUTOMATICALLY', 'POSTED_CONFIRMED', 'SKIPPED');

-- AlterTable
ALTER TABLE "financial_transaction" ADD COLUMN     "recurringExpenseOccurrenceId" TEXT;

-- CreateTable
CREATE TABLE "recurring_expense_occurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurringExpenseId" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "nameSnapshot" VARCHAR(120) NOT NULL,
    "scheduledAmountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "expenseCategoryId" TEXT,
    "postingBehaviorSnapshot" "RecurringPostingBehavior" NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_expense_occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_expense_occurrence_userId_status_dueOn_idx" ON "recurring_expense_occurrence"("userId", "status", "dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_expense_occurrence_id_userId_key" ON "recurring_expense_occurrence"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_expense_occurrence_recurringExpenseId_dueOn_key" ON "recurring_expense_occurrence"("recurringExpenseId", "dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transaction_recurringExpenseOccurrenceId_key" ON "financial_transaction"("recurringExpenseOccurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transaction_recurringExpenseOccurrenceId_userId_key" ON "financial_transaction"("recurringExpenseOccurrenceId", "userId");

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_recurringExpenseOccurrenceId_userId_fkey" FOREIGN KEY ("recurringExpenseOccurrenceId", "userId") REFERENCES "recurring_expense_occurrence"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense_occurrence" ADD CONSTRAINT "recurring_expense_occurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense_occurrence" ADD CONSTRAINT "recurring_expense_occurrence_recurringExpenseId_userId_fkey" FOREIGN KEY ("recurringExpenseId", "userId") REFERENCES "recurring_expense"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense_occurrence" ADD CONSTRAINT "recurring_expense_occurrence_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense_occurrence" ADD CONSTRAINT "recurring_expense_occurrence_expenseCategoryId_userId_fkey" FOREIGN KEY ("expenseCategoryId", "userId") REFERENCES "expense_category"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

