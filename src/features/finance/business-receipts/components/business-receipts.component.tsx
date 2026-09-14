import Link from "next/link";
import { getBusinessReceiptWorkspace } from "@/features/finance/business-receipts/queries/business-receipt.query";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { formatMoney } from "@/lib/money/utils/money.util";
import { FinanceSection } from "@/features/finance/components/finance-field.component";
import {
  BusinessReceiptForm,
  ReceiptResolutionForm,
} from "@/features/finance/business-receipts/components/business-receipt-form.component";
export async function BusinessReceipts({
  userId,
  transactionId,
  currency,
}: {
  userId: string;
  transactionId: string;
  amountMinor: bigint;
  currency: string;
}) {
  const workspace = await getBusinessReceiptWorkspace(userId, transactionId);
  const { allocations, attributed, remaining } = workspace;
  return (
    <FinanceSection
      title="Entrepreneurship receipt attribution"
      description="The audience and offer perspective on this same income. Work-session allocation is a separate dimension: never add the two totals."
      action={
        <BusinessReceiptForm
          {...workspace}
          transactionId={transactionId}
          currency={currency}
        />
      }
    >
      <p className="text-body text-text-secondary mb-xl">
        {formatMoney(attributed, currency)} attributed ·{" "}
        {formatMoney(remaining, currency)} available for attribution
      </p>
      {allocations.length ? (
        allocations.map((allocation) => (
          <article key={allocation.id} className="border-border py-xl border-t">
            <div className="gap-lg flex flex-wrap items-center justify-between">
              <div>
                <p className="text-body font-medium">
                  <AudienceSummary {...allocation} />
                </p>
                {allocation.companyId && (
                  <Link
                    className="text-body-sm text-primary mt-sm inline-flex hover:underline"
                    href={`/entrepreneurship/market/companies/${allocation.companyId}`}
                  >
                    View business ↗
                  </Link>
                )}
                <p className="text-body-sm text-text-muted mt-sm">
                  {allocation.offerRevision
                    ? `${allocation.offerRevision.title} · revision ${allocation.offerRevision.version}`
                    : "Audience context only"}
                </p>
              </div>
              <strong className="finance-number">
                {formatMoney(
                  allocation.amountMinor,
                  allocation.currencySnapshot,
                )}
              </strong>
            </div>
            <p className="text-body-sm text-text-muted my-md">
              {allocation.withdrawnAt
                ? `Withdrawn · ${allocation.withdrawalReason}`
                : allocation.needsReviewAt
                  ? "Source changed · excluded from confirmed receipt totals until reviewed"
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
          No audience attribution yet. Unattributed money remains part of
          Finance’s recorded income.
        </p>
      )}
    </FinanceSection>
  );
}
