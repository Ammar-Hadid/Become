import Link from "next/link";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { formatMoney } from "@/lib/money/utils/money.util";
import { FinanceSection } from "@/features/finance/components/finance-field.component";
import {
  BusinessReceiptForm,
  ReceiptResolutionForm,
} from "@/features/finance/business-receipts/components/business-receipt-form.component";
export async function BusinessReceipts({
  userId,
  transactionId,
  amountMinor,
  currency,
}: {
  userId: string;
  transactionId: string;
  amountMinor: bigint;
  currency: string;
}) {
  const [companies, offers, allocations] = await Promise.all([
    prisma.company.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.offerRevision.findMany({
      where: { userId, proposedAt: { not: null } },
      select: { id: true, companyId: true, title: true, version: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessReceiptAllocation.findMany({
      where: { userId, transactionId },
      include: { offerRevision: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const active = allocations.filter((allocation) => !allocation.withdrawnAt);
  const attributed = active.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0n,
  );
  return (
    <FinanceSection
      title="Business receipt attribution"
      description="A company and offer perspective on this same income. Work-session allocation is a separate dimension: never add the two totals."
      action={
        <BusinessReceiptForm
          companies={companies}
          offers={offers}
          transactionId={transactionId}
          currency={currency}
        />
      }
    >
      <p className="text-body text-text-secondary mb-xl">
        {formatMoney(attributed, currency)} attributed ·{" "}
        {formatMoney(amountMinor - attributed, currency)} not attributed to a
        company
      </p>
      {allocations.length ? (
        allocations.map((allocation) => (
          <article key={allocation.id} className="border-border py-xl border-t">
            <div className="gap-lg flex flex-wrap items-center justify-between">
              <div>
                <Link
                  className="text-body font-medium"
                  href={`/entrepreneurship/market/companies/${allocation.companyId}`}
                >
                  {allocation.companySnapshot}
                </Link>
                <p className="text-meta text-text-muted mt-sm">
                  {allocation.offerRevision
                    ? `${allocation.offerRevision.title} · revision ${allocation.offerRevision.version}`
                    : "Company only"}
                </p>
              </div>
              <strong className="finance-number">
                {formatMoney(
                  allocation.amountMinor,
                  allocation.currencySnapshot,
                )}
              </strong>
            </div>
            <p className="text-meta text-text-muted my-md">
              {allocation.withdrawnAt
                ? `Withdrawn · ${allocation.withdrawalReason}`
                : allocation.needsReviewAt
                  ? "Source changed · excluded from confirmed business totals until reviewed"
                  : "Confirmed attribution"}
            </p>
            {!allocation.withdrawnAt && (
              <ReceiptResolutionForm
                id={allocation.id}
                review={Boolean(allocation.needsReviewAt)}
              />
            )}
          </article>
        ))
      ) : (
        <p className="text-body text-text-secondary">
          No company attribution yet. Unattributed money remains part of
          Finance’s recorded income.
        </p>
      )}
    </FinanceSection>
  );
}
