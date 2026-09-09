import { CompanyReceipts } from "@/features/finance/business-receipts/components/company-receipts.component";
import { OfferRevisionComparison } from "@/features/entrepreneurship/offers/components/offer-revision-comparison.component";
import { ArchiveBusinessRecord } from "@/features/entrepreneurship/shared/components/archive-business-record.component";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { retractOfferEventAction } from "@/features/entrepreneurship/offers/actions/offer.action";
import {
  FollowUpForm,
  FollowUpRecord,
} from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getOfferDetail } from "@/features/entrepreneurship/offers/queries/offer.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import {
  OfferForm,
  OfferEventForm,
  OfferContinuationForm,
} from "@/features/entrepreneurship/offers/components/offer-forms.component";
import {
  quoteLabel,
  offerPresentation,
} from "@/features/entrepreneurship/offers/utils/offer.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { moneyDecimal } from "@/lib/money/utils/money.util";
export async function OfferDetail({
  userId,
  id,
  nicheId,
}: {
  userId: string;
  id: string;
  nicheId?: string;
}) {
  const [offer, options, workSources] = await Promise.all([
    getOfferDetail(userId, id),
    getInteractionOptions(userId, nicheId),
    prisma.workSource.findMany({
      where: { userId: userId, archivedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  if (!offer) notFound();
  const { quote, latest, acceptance, status } = offerPresentation(
    offer.revisions,
    offer.events,
  );
  const interactions = await prisma.interactionRevision.findMany({
    where: {
      userId: userId,
      companyId: offer.companyId,
      interaction: { voidedAt: null },
    },
    distinct: ["interactionId"],
    orderBy: [{ interactionId: "asc" }, { version: "desc" }],
    take: 100,
  });
  return (
    <>
      <Link className="business-back" href="/entrepreneurship/offers">
        ← Offers
      </Link>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {offer.company.name} · {humanize(status)}
            {acceptance && status !== "ACCEPTED"
              ? " · acceptance retained"
              : ""}
          </p>
          <h2>{quote.title}</h2>
        </div>
        <div className="business-actions">
          <OfferEventForm
            offerId={id}
            problems={options.problems}
            revisions={offer.revisions.map((revision) => ({
              id: revision.id,
              name: `${revision.title} · revision ${revision.version}`,
            }))}
            interactions={interactions.map((i) => ({
              id: i.interactionId,
              revisionId: i.id,
              name: i.summary.slice(0, 100),
            }))}
          />
          <ArchiveBusinessRecord
            kind="offer"
            id={id}
            archived={Boolean(offer.archivedAt)}
          />
        </div>
      </header>
      {offer.events.some(
        (event) => event.kind === "ACCEPTED" && !event.retractedAt,
      ) && (
        <section className="business-zone business-continuation-zone">
          <h3>Continue into work</h3>
          <p>
            {offer.continuationChoice
              ? humanize(offer.continuationChoice)
              : "Choose whether a Finance work-source link would help."}
          </p>
          <div className="mt-lg">
            <OfferContinuationForm offerId={id} workSources={workSources} />
          </div>
        </section>
      )}
      <div className="business-detail-grid">
        <div className="business-detail-main">
          <section className="business-offer-quote">
            <p className="eyebrow">
              {acceptance
                ? "Accepted terms"
                : quote.proposedAt
                  ? offer.events.some(
                      (event) =>
                        event.offerRevisionId === quote.id &&
                        event.kind === "PROPOSED" &&
                        !event.retractedAt,
                    )
                    ? "Proposed terms"
                    : "Retained terms · proposal corrected"
                  : "Draft terms"}{" "}
              · revision {quote.version}
            </p>
            <h3>{quoteLabel(quote)}</h3>
            <p className="business-prose">{quote.scope}</p>
            {quote.terms && (
              <>
                <h4>Terms</h4>
                <p className="business-prose">{quote.terms}</p>
              </>
            )}
            {quote.expiresOn && (
              <p className="business-hint">
                Quote expires {businessDate(quote.expiresOn)}. No customer
                response is inferred from expiry.
              </p>
            )}
            <div className="business-actions mt-xl">
              <OfferForm
                offerId={id}
                companyId={offer.companyId}
                companies={options.companies}
                problems={options.problems}
                initial={{
                  ...quote,
                  amount:
                    quote.priceMinor === null || !quote.currency
                      ? ""
                      : moneyDecimal(quote.priceMinor, quote.currency),
                  currency: quote.currency ?? "EUR",
                }}
              />
            </div>
          </section>
          <section className="business-detail-section">
            <h3>What happened</h3>
            {offer.events.length ? (
              offer.events.map((event) => (
                <article key={event.id} className="business-outcome">
                  <div className="business-row-heading">
                    <div className="business-meta">
                      <strong>
                        {humanize(event.kind)}
                        {event.retractedAt ? " · corrected / withdrawn" : ""}
                      </strong>
                      <time>{businessDate(event.occurredAt)}</time>
                      <span>Revision {event.revision.version}</span>
                    </div>
                    {!event.retractedAt && (
                      <CorrectionMenu
                        label="Outcome actions"
                        title="Retract outcome"
                        description="Correct an outcome without erasing what was originally recorded."
                        action={retractOfferEventAction.bind(null, event.id)}
                      />
                    )}
                  </div>
                  <p className="business-prose">{event.sourceDescription}</p>
                  {event.interactionId && (
                    <Link
                      className="business-text-link"
                      href={`/entrepreneurship/interactions/${event.interactionId}`}
                    >
                      Source interaction ↗
                    </Link>
                  )}
                </article>
              ))
            ) : (
              <p className="business-inline-empty">
                No proposal or outcome recorded. This is still a draft.
              </p>
            )}
            {latest?.kind === "PROPOSED" && (
              <p className="business-hint">No response recorded.</p>
            )}
          </section>
          <CompanyReceipts
            userId={userId}
            companyId={offer.companyId}
            offerId={id}
            offerRevisionId={quote.proposedAt ? quote.id : undefined}
          />
          {offer.revisions[0].id !== quote.id && (
            <section className="business-detail-section">
              <p className="eyebrow">
                Newer{" "}
                {offer.revisions[0].proposedAt ? "quoted revision" : "draft"} ·
                revision {offer.revisions[0].version}
              </p>
              <h3>{quoteLabel(offer.revisions[0])}</h3>
              <p className="business-prose">{offer.revisions[0].scope}</p>
              <p className="business-hint">
                These are separate from the accepted terms above.
              </p>
            </section>
          )}
          <OfferRevisionComparison
            revisions={offer.revisions}
            events={offer.events}
          />
        </div>
        <aside className="business-aside">
          <section className="business-detail-section">
            <h3>Next actions</h3>
            <FollowUpForm target={{ offerId: id }} />
            {offer.followUps.map((followUp) => (
              <FollowUpRecord key={followUp.id} record={followUp} />
            ))}
          </section>
          <section className="business-aside-section">
            <p className="eyebrow">For this company</p>
            <Link
              className="business-text-link mt-lg inline-block"
              href={`/entrepreneurship/market/companies/${offer.companyId}`}
            >
              {offer.company.name}
            </Link>
            <div className="business-aside-divider">
              <h3>Problems addressed</h3>
              {quote.problems.length ? (
                <div className="business-related-list">
                  {quote.problems.map(({ problem }) => (
                    <Link
                      key={problem.id}
                      className="business-text-link"
                      href={`/entrepreneurship/problems/${problem.id}`}
                    >
                      {problem.title}
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No problem linked.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
