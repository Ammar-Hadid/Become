-- CreateEnum
CREATE TYPE "FinanceActivityKind" AS ENUM ('PAID_WORK', 'OPPORTUNITY_SEARCH', 'APPLICATION', 'ASSESSMENT', 'FINANCE_ADMIN');

-- AlterTable
ALTER TABLE "activity_type" ADD COLUMN     "financeActivityKind" "FinanceActivityKind";

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "financeActivityKind" "FinanceActivityKind",
ADD COLUMN     "financeCompensationType" "FinanceCompensationType",
ADD COLUMN     "incomeOpportunityId" TEXT,
ADD COLUMN     "paymentAttributionCompleteAt" TIMESTAMP(3),
ADD COLUMN     "workSourceId" TEXT;

-- CreateIndex
CREATE INDEX "session_userId_financeActivityKind_startedAt_idx" ON "session"("userId", "financeActivityKind", "startedAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_workSourceId_userId_fkey" FOREIGN KEY ("workSourceId", "userId") REFERENCES "work_source"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_incomeOpportunityId_userId_fkey" FOREIGN KEY ("incomeOpportunityId", "userId") REFERENCES "income_opportunity"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only exact known seeded Finance activities are classified; custom meaning is unknown.
UPDATE activity_type a SET "financeActivityKind" = mapping.kind::"FinanceActivityKind"
FROM domain d, (VALUES ('paid-work', 'Paid work', 'PAID_WORK'), ('opportunity-search', 'Opportunity search', 'OPPORTUNITY_SEARCH'), ('application', 'Application', 'APPLICATION'), ('assessment', 'Assessment', 'ASSESSMENT'), ('finance-admin', 'Finance admin', 'FINANCE_ADMIN')) AS mapping(slug, name, kind)
WHERE a."domainId" = d.id AND d.slug = 'finance' AND a.slug = mapping.slug AND a.name = mapping.name;
UPDATE session s SET "financeActivityKind" = a."financeActivityKind"
FROM activity_type a WHERE s."activityTypeId" = a.id AND a."financeActivityKind" IS NOT NULL;
