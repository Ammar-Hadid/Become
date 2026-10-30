import { Card } from "@/components/ui/cards/card.component";
import type { ReactNode } from "react";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  OfferContinuationForm,
  OfferEventForm,
} from "@/features/entrepreneurship/offers/components/offer-forms.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { retractOfferEventAction } from "@/features/entrepreneurship/offers/actions/offer.action";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { formatMoney } from "@/lib/money/utils/money.util";
import type { getOfferDetail } from "@/features/entrepreneurship/offers/queries/offer.query";
import type { BusinessOption } from "@/features/entrepreneurship/shared/types/business.types";
import type { AudienceOption } from "@/features/entrepreneurship/audiences/types/audience.types";

type LoadedOffer = NonNullable<Awaited<ReturnType<typeof getOfferDetail>>>;
type Engagement = LoadedOffer["engagements"][number];

export function OfferResponseJournal({
  offer,
  workSources,
  interactions,
  problems,
  renderReceipts,
  segments = [],
}: {
  offer: LoadedOffer;
  workSources: BusinessOption[];
  interactions: { id: string; revisionId: string; name: string }[];
  problems: BusinessOption[];
  renderReceipts?: (engagement: Engagement) => ReactNode;
  segments?: AudienceOption[];
}) {
  const sharedRevisions = offer.revisions.filter((revision) =>
    offer.events.some(
      (event) =>
        !event.retractedAt &&
        event.offerRevisionId === revision.id &&
        event.kind === "SHARED",
    ),
  );
  return (
    <Card
      material="glass"
      spacing="dense"
      className="business-zone business-zone--ledger"
    >
      <div className="business-row-heading">
        <div>
          <p className="eyebrow">Separate people, separate outcomes</p>
          <h3>Response journal</h3>
        </div>
      </div>
      <p className="business-hint mb-2xl">
        Each recipient responds to exact terms. Their choice and payments stay
        here; one response does not conclude the entire test.
      </p>
      {offer.engagements.length ? (
        <div className="gap-xl grid">
          {offer.engagements.map((engagement) => {
            const latest = engagement.events[0];
            const history = offer.events.filter(
              (event) => event.engagementId === engagement.id,
            );
            const accepted = engagement.events.find(
              (event) => event.kind === "ACCEPTED",
            );
            return (
              <article
                key={engagement.id}
                className="rounded-panel border-border bg-surface-input p-xl border"
                id={`response-${engagement.id}`}
              >
                <div className="gap-lg flex flex-wrap items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-body-lg text-text-primary font-medium">
                      {engagement.personSnapshot ??
                        engagement.companySnapshot ??
                        engagement.audienceLabel ??
                        "Unnamed recipient"}
                    </p>
                    <p className="mt-sm text-body-sm text-text-secondary">
                      <AudienceSummary {...engagement} />
                    </p>
                    <p className="mt-sm text-body-sm text-text-muted">
                      {latest
                        ? `${humanize(latest.kind)} · ${businessDate(latest.occurredAt)} · revision ${latest.revision.version}`
                        : "No current response recorded"}
                    </p>
                  </div>
                  <OfferEventForm
                    offerId={offer.id}
                    mode="AUDIENCE_TEST"
                    engagementId={engagement.id}
                    problems={problems}
                    segments={segments}
                    revisions={sharedRevisions.map((revision) => ({
                      id: revision.id,
                      name: `${revision.title} · revision ${revision.version}`,
                    }))}
                    interactions={interactions}
                  />
                </div>
                {latest && (
                  <p className="business-prose mt-lg">
                    {latest.sourceDescription}
                  </p>
                )}
                <details className="business-disclosure mt-xl">
                  <summary>Response history & exact terms</summary>
                  <div>
                    {history.map((event) => (
                      <article key={event.id} className="business-record-row">
                        <div className="business-row-heading">
                          <p className="business-meta">
                            {humanize(event.kind)}
                            {event.retractedAt
                              ? " · corrected / withdrawn"
                              : ""}{" "}
                            · {businessDate(event.occurredAt)} · revision{" "}
                            {event.revision.version}
                          </p>
                          {!event.retractedAt && (
                            <CorrectionMenu
                              label="Response outcome actions"
                              title="Retract response outcome"
                              description="Preserve the original outcome and its exact terms while correcting what counts now."
                              action={retractOfferEventAction.bind(
                                null,
                                event.id,
                              )}
                            />
                          )}
                        </div>
                        <p className="business-prose">
                          {event.sourceDescription}
                        </p>
                        <p className="business-hint mt-sm">
                          Terms: {event.revision.scope}
                        </p>
                        {event.interactionId && (
                          <Link
                            className="business-text-link mt-sm"
                            href={`/entrepreneurship/interactions/${event.interactionId}`}
                          >
                            Read source interaction ↗
                          </Link>
                        )}
                      </article>
                    ))}
                  </div>
                </details>
                {accepted && (
                  <details className="business-disclosure mt-xl">
                    <summary>Continue into work</summary>
                    <div>
                      <p className="business-hint">
                        Acceptance recorded for revision{" "}
                        {accepted.revision.version}.{" "}
                        {engagement.continuationChoice
                          ? humanize(engagement.continuationChoice)
                          : "Choose whether a Finance work-source link would help."}
                      </p>
                      <OfferContinuationForm
                        offerId={offer.id}
                        engagementId={engagement.id}
                        workSources={workSources}
                      />
                      {engagement.workSource && (
                        <Link
                          className="business-text-link"
                          href={`/finance/opportunities#work-source-${engagement.workSource.id}`}
                        >
                          {engagement.workSource.name} ↗
                        </Link>
                      )}
                    </div>
                  </details>
                )}
                {renderReceipts ? (
                  renderReceipts(engagement)
                ) : (
                  <div className="mt-xl border-border pt-lg border-t">
                    <p className="text-body font-medium">Actual receipts</p>
                    {engagement.receipts.length ? (
                      engagement.receipts.map((receipt) => (
                        <p
                          key={receipt.id}
                          className="mt-sm text-body-sm text-text-secondary"
                        >
                          {formatMoney(
                            receipt.amountMinor,
                            receipt.currencySnapshot,
                          )}{" "}
                          ·{" "}
                          {receipt.withdrawnAt || !receipt.transaction
                            ? "Withdrawn source"
                            : receipt.needsReviewAt
                              ? "Attribution needs review"
                              : `Received ${businessDate(receipt.transaction.occurredAt)}`}
                          {receipt.transactionId && (
                            <>
                              {" "}
                              ·{" "}
                              <Link
                                className="business-text-link"
                                href={`/finance/transactions/${receipt.transactionId}`}
                              >
                                Finance source ↗
                              </Link>
                            </>
                          )}
                        </p>
                      ))
                    ) : (
                      <p className="business-hint mt-sm">
                        No attributed payment. Acceptance does not create
                        income.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="business-inline-empty">
          {sharedRevisions.length
            ? "No recipient responses recorded. Add what an actual gamer or business said about the shared terms."
            : "Record when you shared these terms, then keep individual responses here."}
        </p>
      )}
    </Card>
  );
}
