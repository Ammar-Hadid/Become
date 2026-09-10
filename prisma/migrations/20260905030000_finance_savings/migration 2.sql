-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "savings_goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "targetAmountMinor" BIGINT NOT NULL,
    "allocatedAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goal_expense_allocation" (
    "userId" TEXT NOT NULL,
    "savingsGoalId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goal_expense_allocation_pkey" PRIMARY KEY ("savingsGoalId","transactionId")
);

-- CreateIndex
CREATE INDEX "savings_goal_userId_currency_archivedAt_idx" ON "savings_goal"("userId", "currency", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "savings_goal_id_userId_key" ON "savings_goal"("id", "userId");

-- CreateIndex
CREATE INDEX "savings_goal_expense_allocation_userId_transactionId_idx" ON "savings_goal_expense_allocation"("userId", "transactionId");

-- AddForeignKey
ALTER TABLE "savings_goal" ADD CONSTRAINT "savings_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goal_expense_allocation" ADD CONSTRAINT "savings_goal_expense_allocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goal_expense_allocation" ADD CONSTRAINT "savings_goal_expense_allocation_savingsGoalId_userId_fkey" FOREIGN KEY ("savingsGoalId", "userId") REFERENCES "savings_goal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goal_expense_allocation" ADD CONSTRAINT "savings_goal_expense_allocation_transactionId_userId_fkey" FOREIGN KEY ("transactionId", "userId") REFERENCES "financial_transaction"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE savings_goal ADD CONSTRAINT savings_goal_positive CHECK ("targetAmountMinor" > 0 AND "allocatedAmountMinor" >= 0);
ALTER TABLE savings_goal ADD CONSTRAINT savings_goal_archive_release CHECK ("archivedAt" IS NULL OR "allocatedAmountMinor" = 0);
ALTER TABLE savings_goal_expense_allocation ADD CONSTRAINT savings_expense_positive CHECK ("amountMinor" > 0);
