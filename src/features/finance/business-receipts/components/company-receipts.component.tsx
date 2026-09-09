import Link from "next/link";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { formatMoney } from "@/lib/money/utils/money.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import { CompanyReceiptForm } from "@/features/finance/business-receipts/components/company-receipt-form.component";
export async function CompanyReceipts({
  userId,
  companyId,
  offerId,
  offerRevisionId,
}: {
  userId: string;
  companyId: string;
  offerId?: string;
  offerRevisionId?: string;
}) {
  const [income, offers, allocations] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        userId,
        type: "INCOME",
        inflowKind: { in: ["BUSINESS_REVENUE", "EARNED_WORK"] },
      },
      include: {
        account: true,
        businessReceiptAllocations: { where: { withdrawnAt: null } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.offerRevision.findMany({
      where: {
        userId,
        companyId,
        proposedAt: { not: null },
        ...(offerId ? { offerId } : {}),
      },
      orderBy: { version: "desc" },
      select: { id: true, title: true, version: true },
    }),
    prisma.businessReceiptAllocation.findMany({
      where: {
        userId,
        companyId,
        ...(offerId ? { offerRevision: { offerId } } : {}),
      },
      include: { transaction: true, offerRevision: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const receipts = income
    .map((r) => ({
      id: r.id,
      currency: r.currency,
      remaining: (
        r.amountMinor -
        r.businessReceiptAllocations.reduce((s, a) => s + a.amountMinor, 0n)
      ).toString(),
      name: `${businessDate(r.occurredAt)} · ${formatMoney(r.amountMinor, r.currency)} · ${r.account.name}${r.notes ? ` · ${r.notes}` : ""}`,
    }))
    .filter((r) => BigInt(r.remaining) > 0n);
  const context = new URLSearchParams({
    company: companyId,
    ...(offerId ? { offer: offerId } : {}),
  });
  return (
    <section className="business-detail-section" id="receipts">
      <div className="business-row-heading">
        <h3>Actual receipts</h3>
        <div className="business-actions">
          <CompanyReceiptForm
            companyId={companyId}
            offers={offers}
            receipts={receipts}
            offerRevisionId={offerRevisionId}
          />
          <Link
            className="business-text-link"
            href={`/finance/transactions?${context}`}
          >
            Record receipt in Finance ↗
          </Link>
        </div>
      </div>
      <p className="business-hint">
        Explicit parts of the same Finance income. Acceptance and WorkSource
        linking do not create payments.
      </p>
      {allocations.length ? (
        allocations.map((a) => (
          <article key={a.id} className="business-outcome">
            <p>
              {formatMoney(a.amountMinor, a.currencySnapshot)} ·{" "}
              {a.withdrawnAt || !a.transaction
                ? "Withdrawn source"
                : a.needsReviewAt
                  ? "Attribution needs review"
                  : `Received ${businessDate(a.transaction.occurredAt)}`}
            </p>
            <p className="business-hint">
              {a.offerRevision
                ? `${a.offerRevision.title} · revision ${a.offerRevision.version}`
                : "Company only"}
            </p>
            {a.transactionId && (
              <Link
                className="business-text-link"
                href={`/finance/transactions/${a.transactionId}`}
              >
                View the Finance receipt ↗
              </Link>
            )}
          </article>
        ))
      ) : (
        <p className="business-inline-empty">
          No receipts attributed. Accepted terms are not received income.
        </p>
      )}
    </section>
  );
}
