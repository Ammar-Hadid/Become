import { Card } from "@/components/ui/cards/card.component";
import { Input } from "@/components/ui/forms/input.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { FileText, ArrowUpRight, Search, X } from "lucide-react";
import {
  getOfferDetail,
  getOffers,
} from "@/features/entrepreneurship/offers/queries/offer.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { OfferForm } from "@/features/entrepreneurship/offers/components/offer-forms.component";
import {
  quoteLabel,
  offerPresentation,
} from "@/features/entrepreneurship/offers/utils/offer.util";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
export async function OfferList({
  userId,
  cursor,
  archived = false,
  nicheId,
  selectedId,
  query,
  mode,
}: {
  userId: string;
  cursor?: string;
  archived?: boolean;
  nicheId?: string;
  selectedId?: string;
  query?: string;
  mode?: "SPECIFIC" | "AUDIENCE_TEST";
}) {
  const [data, options, selected] = await Promise.all([
    getOffers(userId, cursor, archived, nicheId, { q: query, mode }),
    getInteractionOptions(userId, nicheId),
    selectedId
      ? getOfferDetail(userId, selectedId, nicheId)
      : Promise.resolve(null),
  ]);
  const selectedPresentation = selected
    ? offerPresentation(selected.revisions, selected.events)
    : null;
  const offersHref = nicheId
    ? explorationWorkspaceHref(nicheId, "offers")
    : "/entrepreneurship/offers";
  const listParams = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(mode ? { mode } : {}),
    ...(cursor ? { cursor } : {}),
    ...(archived ? { archived: "true" } : {}),
  });
  const hrefWith = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(listParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const suffix = params.toString();
    return `${offersHref}${suffix ? `?${suffix}` : ""}`;
  };
  return (
    <div className={nicheId ? "direct-workspace offers-workspace" : undefined}>
      <header
        className={
          nicheId
            ? "workspace-heading"
            : "business-section-heading business-page-heading"
        }
      >
        <div>
          {nicheId && <p className="eyebrow">Offers</p>}
          <h2>Your offers</h2>
          <p>Compare your proposals, responses and confirmed receipts.</p>
        </div>
        <OfferForm
          companies={options.companies}
          people={options.people}
          segments={options.segments}
          problems={options.problems}
        />
      </header>
      {nicheId && (
        <form className="workspace-toolbar offers-toolbar" action={offersHref}>
          {archived && <input type="hidden" name="archived" value="true" />}
          <label className="workspace-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search offers</span>
            <Input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search titles, scope, or terms"
            />
          </label>
          <label className="workspace-filter">
            <span className="sr-only">Offer type</span>
            <NativeSelect name="mode" defaultValue={mode ?? ""}>
              <option value="">All offer types</option>
              <option value="SPECIFIC">Specific proposals</option>
              <option value="AUDIENCE_TEST">Audience tests</option>
            </NativeSelect>
          </label>
          <Button variant="secondary" type="submit">
            Filter
          </Button>
          <span className="workspace-toolbar-count">{data.total} total</span>
        </form>
      )}
      <Card
        material="glass"
        spacing="dense"
        className={
          nicheId
            ? "workspace-ledger"
            : `business-zone business-zone--ledger${archived ? "business-zone--archived" : ""}`
        }
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
                ? hrefWith({
                    archived: undefined,
                    cursor: undefined,
                    selected: undefined,
                  })
                : hrefWith({
                    archived: "true",
                    cursor: undefined,
                    selected: undefined,
                  })
            }
          >
            {archived ? "View current" : "View archived"}
          </Link>
        </div>
        {data.records.length ? (
          <div className={selected ? "workspace-split" : undefined}>
            <div className="business-offer-list workspace-record-list">
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
                    href={
                      nicheId
                        ? hrefWith({ selected: offer.id })
                        : `/entrepreneurship/offers/${offer.id}`
                    }
                    scroll={false}
                    key={offer.id}
                    aria-current={offer.id === selectedId ? "true" : undefined}
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
            {selected && selectedPresentation && (
              <Card
                material="glass"
                spacing="dense"
                className="workspace-inspector"
                aria-label="Selected offer"
              >
                <header>
                  <p className="eyebrow">Quick inspect</p>
                  <Link
                    className="workspace-inspector-close"
                    href={hrefWith({ selected: undefined })}
                    scroll={false}
                    aria-label="Close offer preview"
                  >
                    <X aria-hidden="true" />
                  </Link>
                </header>
                <div>
                  <span className="business-status-badge">
                    {selected.mode === "AUDIENCE_TEST"
                      ? "Audience test"
                      : humanize(selectedPresentation.status)}
                  </span>
                  <h3>{selectedPresentation.quote.title}</h3>
                  <p>
                    <AudienceSummary {...selectedPresentation.quote} />
                  </p>
                  <p className="workspace-inspector-prose">
                    {selectedPresentation.quote.scope}
                  </p>
                  <dl className="workspace-inspector-facts">
                    <div>
                      <dt>Terms</dt>
                      <dd>{quoteLabel(selectedPresentation.quote)}</dd>
                    </div>
                    <div>
                      <dt>Events</dt>
                      <dd>
                        {
                          selected.events.filter((event) => !event.retractedAt)
                            .length
                        }
                      </dd>
                    </div>
                  </dl>
                  <Link
                    className="become-button become-button--primary become-button--md"
                    href={withExplorationReturn(
                      explorationWorkspaceHref(
                        nicheId!,
                        "offers",
                        `/${selected.id}`,
                      ),
                      hrefWith({ selected: selected.id }),
                    )}
                  >
                    Open full offer <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            )}
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
            href={hrefWith({ cursor: data.next, selected: undefined })}
          >
            More offers →
          </Link>
        )}
      </Card>
    </div>
  );
}
