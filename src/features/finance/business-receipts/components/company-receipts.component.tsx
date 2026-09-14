import Link from "next/link";
import { getEntrepreneurshipReceiptPanel } from "@/features/finance/business-receipts/queries/business-receipt.query";
import {
  AudienceSummary,
  type AudienceFieldValue,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { formatMoney } from "@/lib/money/utils/money.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import { CompanyReceiptForm } from "@/features/finance/business-receipts/components/company-receipt-form.component";
export async function CompanyReceipts({
  userId,
  companyId,
  offerId,
  offerRevisionId,
  engagementId,
  nicheId,
  audience,
  explorationOptions,
}: {
  userId: string;
  companyId?: string;
  offerId?: string;
  offerRevisionId?: string;
  engagementId?: string;
  nicheId?: string;
  audience?: AudienceFieldValue;
  explorationOptions?: { id: string; name: string }[];
}) {
  const { receipts, offers, allocations } =
    await getEntrepreneurshipReceiptPanel(userId, {
      companyId,
      offerId,
      engagementId,
      nicheId,
    });
  const context = new URLSearchParams({
    ...(companyId ? { company: companyId } : {}),
    ...(offerId ? { offer: offerId } : {}),
    ...(engagementId ? { engagement: engagementId } : {}),
    ...(nicheId ? { exploration: nicheId } : {}),
  });
  return (
    <section
      className="business-detail-section"
      id={engagementId ? `receipts-${engagementId}` : "receipts"}
    >
      <div className="business-row-heading">
        <h3>Actual receipts</h3>
        <div className="business-actions">
          {(!offerId || offers.length > 0) && (
            <CompanyReceiptForm
              companyId={companyId}
              offers={offers}
              receipts={receipts}
              offerRevisionId={offerRevisionId}
              engagementId={engagementId}
              nicheId={nicheId}
              audience={audience}
              explorationOptions={explorationOptions}
            />
          )}
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
      {offerId && offers.length === 0 && (
        <p className="business-hint mt-lg">
          No current shared terms available for attribution. Keep the actual
          income in Finance; connect it to this offer when the relevant terms
          and source are recorded.
        </p>
      )}
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
                : "Audience context only"}
            </p>
            <p className="business-hint">
              <AudienceSummary {...a} />
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
