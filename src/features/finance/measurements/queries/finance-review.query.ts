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
      qualification: `Actual INCOME transactions classified ${kind}, dated in the reporting window and separated by currency. Pending observations, transfers, quotations and acceptance are excluded. The unified ledger includes manual, live-sync and statement-import facts; unreviewed classification remains provisional.`,
      moment: kind === "EARNED_WORK" || kind === "BUSINESS_REVENUE",
    })),
    {
      key: "finance.expenses",
      domain: "finance",
      label: "Expenses recorded",
      unit: "minor",
      qualification:
        "Actual expense transactions, by currency. Pending observations and transfers are excluded; no FX conversion. Manual, live-sync and statement-import facts share this ledger; review and coverage qualifications remain separate.",
      moment: false,
    },
  ],
  sql: (scope) => Prisma.sql`
    SELECT CASE WHEN t.type='INCOME' THEN 'finance.income.'||t."inflowKind"::text ELSE 'finance.expenses' END AS "metricKey",
      'TRANSACTION'::text AS kind, t.id, t."updatedAt"::text AS revision,
      COALESCE(NULLIF(w.name,''), CASE WHEN t.type='INCOME' THEN 'Recorded inflow' ELSE 'Recorded expense' END) AS label,
      LEFT(provenance.detail||COALESCE(t.notes,''),800) AS excerpt,
      t."occurredAt", '/finance/transactions/'||t.id AS href, t."amountMinor"::text AS value,
      t.currency, COALESCE(w.name,t."inflowKind"::text,'Expense') AS dimension,
      NULL::text AS "imageHref", 'FACT'::text AS meaning,
      LENGTH(provenance.detail||COALESCE(t.notes,''))>800 AS truncated
    FROM financial_transaction t
    LEFT JOIN work_source w ON w.id=t."workSourceId" AND w."userId"=t."userId"
    CROSS JOIN LATERAL (
      SELECT 'Source: '||t."dataSource"::text||COALESCE('; observed via '||(
        SELECT STRING_AGG(DISTINCT o.source::text, ', ' ORDER BY o.source::text)
        FROM financial_evidence_link l
        JOIN financial_evidence_observation o ON o.id=l."observationId" AND o."userId"=l."userId"
        WHERE l."transactionId"=t.id AND l."userId"=t."userId" AND l.status='PROJECTED'
      ),'')||'; '||CASE WHEN t."reviewedAt" IS NULL THEN 'awaiting review. ' ELSE 'reviewed. ' END AS detail
    ) provenance
    WHERE t."userId"=${scope.userId} AND t.type IN ('INCOME','EXPENSE')
      AND t."occurredAt">=${scope.start} AND t."occurredAt"<${scope.end}
      ${scope.currency ? Prisma.sql`AND t.currency=${scope.currency}` : Prisma.empty}
      ${scope.workSourceId ? Prisma.sql`AND t."workSourceId"=${scope.workSourceId} AND t.type='INCOME' AND t."inflowKind"='EARNED_WORK'` : Prisma.empty}`,
};
