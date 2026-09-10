-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringPostingBehavior" AS ENUM ('ASK_TO_CONFIRM', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "RecurringExpenseStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "recurring_expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "expenseCategoryId" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "monthOfYear" INTEGER,
    "startOn" DATE NOT NULL,
    "endOn" DATE,
    "status" "RecurringExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "postingBehavior" "RecurringPostingBehavior" NOT NULL DEFAULT 'ASK_TO_CONFIRM',
    "processedThroughOn" DATE NOT NULL,
    "pausedOn" DATE,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_expense_userId_status_processedThroughOn_idx" ON "recurring_expense"("userId", "status", "processedThroughOn");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_expense_id_userId_key" ON "recurring_expense"("id", "userId");

-- AddForeignKey
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "financial_account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_expenseCategoryId_userId_fkey" FOREIGN KEY ("expenseCategoryId", "userId") REFERENCES "expense_category"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE recurring_expense ADD CONSTRAINT recurring_amount_dates_valid CHECK ("amountMinor" > 0 AND ("endOn" IS NULL OR "endOn" >= "startOn"));
ALTER TABLE recurring_expense ADD CONSTRAINT recurring_schedule_valid CHECK (
  (frequency = 'WEEKLY' AND "dayOfWeek" BETWEEN 1 AND 7 AND "dayOfWeek" IS NOT NULL AND "dayOfMonth" IS NULL AND "monthOfYear" IS NULL)
  OR (frequency = 'MONTHLY' AND "dayOfMonth" BETWEEN 1 AND 31 AND "dayOfMonth" IS NOT NULL AND "dayOfWeek" IS NULL AND "monthOfYear" IS NULL)
  OR (frequency = 'YEARLY' AND "dayOfMonth" BETWEEN 1 AND 31 AND "monthOfYear" BETWEEN 1 AND 12 AND "dayOfMonth" IS NOT NULL AND "monthOfYear" IS NOT NULL AND "dayOfWeek" IS NULL)
);
