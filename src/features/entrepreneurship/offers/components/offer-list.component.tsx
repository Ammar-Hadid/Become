import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { FileText, ArrowUpRight } from "lucide-react";
import { getOffers } from "@/features/entrepreneurship/offers/queries/offer.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { OfferForm } from "@/features/entrepreneurship/offers/components/offer-forms.component";
import {
  quoteLabel,
  offerPresentation,
} from "@/features/entrepreneurship/offers/utils/offer.util";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
export async function OfferList({
  userId,
  cursor,
  archived = false,
  nicheId,
}: {
  userId: string;
  cursor?: string;
  archived?: boolean;
  nicheId?: string;
}) {
  const [data, options] = await Promise.all([
    getOffers(userId, cursor, archived, nicheId),
    getInteractionOptions(userId, nicheId),
  ]);
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <h2>Something worth saying yes to.</h2>
          <p>
            What you offered, what happened, and what was actually received.
          </p>
        </div>
        <OfferForm
          companies={options.companies}
          people={options.people}
          segments={options.segments}
          problems={options.problems}
        />
      </header>
      <section
        className={`business-zone business-zone--ledger${archived ? "business-zone--archived" : ""}`}
      >
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Commercial record</p>
            <h3>{archived ? "Archived offers" : "Current offers"}</h3>
          </div>
          <Link
            className="business-text-link"
            scroll={false}
            href={
              archived
                ? "/entrepreneurship/offers"
                : "/entrepreneurship/offers?archived=true"
            }
          >
            {archived ? "View current" : "View archived"}
          </Link>
        </div>
        {data.records.length ? (
          <div className="business-offer-list">
            {data.records.map((offer) => {
              const presentation = offerPresentation(
                offer.revisions,
                offer.events,
              );
              const { status, acceptance } = presentation;
              const audienceTest = offer.mode === "AUDIENCE_TEST";
              const quote = audienceTest
                ? offer.revisions[0]
                : presentation.quote;
              return (
                <Link
                  className={`business-offer-row${archived ? "business-record--archived" : ""}`}
                  href={`/entrepreneurship/offers/${offer.id}`}
                  key={offer.id}
                >
                  <div className="business-offer-copy">
                    <p className="business-meta">
                      <AudienceSummary {...quote} />
                    </p>
                    <h3>{quote.title}</h3>
                    <p>{quote.scope}</p>
                  </div>
                  <div className="business-offer-terms">
                    <span className="business-status-badge">
                      {audienceTest ? "Audience test" : humanize(status)}
                      {!audienceTest && acceptance && status !== "ACCEPTED"
                        ? " · acceptance retained"
                        : ""}
                    </span>
                    <strong>{quoteLabel(quote)}</strong>
                    <span className="business-hint">
                      {audienceTest
                        ? "Test terms · separate recipient responses"
                        : acceptance
                          ? "Accepted terms"
                          : "Quoted terms"}
                    </span>
                  </div>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="business-empty">
            <FileText aria-hidden="true" />
            <h3>Give the solution a shape.</h3>
            <p>
              Try one set of terms with an audience, or shape a proposal for a
              person or business. An unspecified price can stay unknown.
            </p>
          </div>
        )}
        {data.next && (
          <Link
            className="business-text-link"
            scroll={false}
            href={`?cursor=${data.next}${archived ? "&archived=true" : ""}`}
          >
            More offers →
          </Link>
        )}
      </section>
    </>
  );
}
