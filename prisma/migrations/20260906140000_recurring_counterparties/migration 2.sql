-- Recurring commitments keep their own descriptive name while optionally
-- referencing the reusable counterparty used by generated transactions.
ALTER TABLE "recurring_expense"
ADD COLUMN "counterpartyId" TEXT;

ALTER TABLE "recurring_expense_occurrence"
ADD COLUMN "counterpartyId" TEXT;

CREATE INDEX "recurring_expense_userId_counterpartyId_idx"
ON "recurring_expense"("userId", "counterpartyId");

CREATE INDEX "recurring_expense_occurrence_userId_counterpartyId_dueOn_idx"
ON "recurring_expense_occurrence"("userId", "counterpartyId", "dueOn");

ALTER TABLE "recurring_expense"
ADD CONSTRAINT "recurring_expense_counterpartyId_userId_fkey"
FOREIGN KEY ("counterpartyId", "userId")
REFERENCES "counterparty"("id", "userId")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "recurring_expense_occurrence"
ADD CONSTRAINT "recurring_expense_occurrence_counterpartyId_userId_fkey"
FOREIGN KEY ("counterpartyId", "userId")
REFERENCES "counterparty"("id", "userId")
ON DELETE RESTRICT
ON UPDATE CASCADE;
