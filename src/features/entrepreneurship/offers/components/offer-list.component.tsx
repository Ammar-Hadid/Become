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
      <header className="business-section-heading">
        <div>
          <p className="eyebrow">From understanding to an offer</p>
          <h2>Something worth saying yes to.</h2>
          <p>
            What you offered, what happened, and what was actually received.
          </p>
        </div>
        <OfferForm companies={options.companies} problems={options.problems} />
      </header>
      <div className="business-row-heading">
        <h3>{archived ? "Archived offers" : "Current offers"}</h3>
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
            const { quote, status, acceptance } = offerPresentation(
              offer.revisions,
              offer.events,
            );
            return (
              <Link
                className="business-offer-row"
                href={`/entrepreneurship/offers/${offer.id}`}
                key={offer.id}
              >
                <div>
                  <p className="business-meta">
                    {offer.company.name} · {humanize(status)}
                    {acceptance && status !== "ACCEPTED"
                      ? " · acceptance retained"
                      : ""}
                  </p>
                  <h3>{quote.title}</h3>
                  <p>{quote.scope}</p>
                </div>
                <div>
                  <strong>{quoteLabel(quote)}</strong>
                  <span className="business-hint">
                    {acceptance ? "Accepted terms" : "Quoted terms"}
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
            Start with a company, a useful scope and a quote. An unspecified
            price can stay unknown.
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
    </>
  );
}
