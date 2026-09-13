import { Prisma } from "@/generated/prisma/client";
import type { ReviewSourceProvider } from "@/features/reviews/facts/types/review-source.types";
const inflows = [
  "EARNED_WORK",
  "BUSINESS_REVENUE",
  "STUDENT_FINANCE",
  "GIFT",
  "REFUND",
  "REIMBURSEMENT",
  "OTHER",
];
export const financeReviewProvider: ReviewSourceProvider = {
  definitions: [
    ...inflows.map((kind) => ({
      key: `finance.income.${kind}`,
      domain: "finance" as const,
      label:
        kind === "EARNED_WORK"
          ? "Earned-work income received"
          : kind === "BUSINESS_REVENUE"
            ? "Business revenue received"
            : `${kind.toLowerCase().replaceAll("_", " ")} inflows`,
      unit: "minor" as const,
      qualification: `Actual INCOME transactions classified ${kind}, dated in the reporting window and separated by currency. Transfers, quotations and acceptance are excluded.`,
      moment: kind === "EARNED_WORK" || kind === "BUSINESS_REVENUE",
    })),
    {
      key: "finance.expenses",
      domain: "finance",
      label: "Expenses recorded",
      unit: "minor",
      qualification:
        "Actual expense transactions, by currency. Transfers are excluded; no FX conversion.",
      moment: false,
    },
  ],
  sql: (s) =>
    Prisma.sql`SELECT CASE WHEN t.type='INCOME' THEN 'finance.income.'||t."inflowKind"::text ELSE 'finance.expenses' END AS "metricKey",'TRANSACTION'::text AS kind,t.id,t."updatedAt"::text AS revision,COALESCE(NULLIF(w.name,''),CASE WHEN t.type='INCOME' THEN 'Recorded inflow' ELSE 'Recorded expense' END) AS label,LEFT(COALESCE(t.notes,''),800) AS excerpt,t."occurredAt",'/finance/transactions/'||t.id AS href,t."amountMinor"::text AS value,t.currency,COALESCE(w.name,t."inflowKind"::text,'Expense') AS dimension,NULL::text AS "imageHref",'FACT'::text AS meaning,LENGTH(COALESCE(t.notes,''))>800 AS truncated FROM financial_transaction t LEFT JOIN work_source w ON w.id=t."workSourceId" AND w."userId"=t."userId" WHERE t."userId"=${s.userId} AND t.type IN ('INCOME','EXPENSE') AND t."occurredAt">=${s.start} AND t."occurredAt"<${s.end} ${s.currency ? Prisma.sql`AND t.currency=${s.currency}` : Prisma.empty} ${s.workSourceId ? Prisma.sql`AND t."workSourceId"=${s.workSourceId} AND t.type='INCOME' AND t."inflowKind"='EARNED_WORK'` : Prisma.empty}`,
};
