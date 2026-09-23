import { ExplorationCompanyForm } from "@/features/entrepreneurship/explorations/components/exploration-company-form.component";
import {
  MarketFilters,
  MarketArchiveLink,
} from "@/features/entrepreneurship/market/components/market-filters.component";
import { CompanySearch } from "@/features/entrepreneurship/market/components/company-search.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { ArrowRight, ArrowUpRight, Building2, Compass, X } from "lucide-react";
import { getMarket } from "@/features/entrepreneurship/market/queries/market.query";
import { MarketForm } from "@/features/entrepreneurship/market/components/market-form.component";
import {
  humanize,
  businessDate,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { AudienceNavigation } from "@/features/entrepreneurship/audiences/components/audience-page.component";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
export async function MarketPage({
  userId,
  search,
  archived,
  cursor,
  nicheArchived = false,
  nicheId,
  selectedId,
}: {
  userId: string;
  search: string;
  archived: boolean;
  cursor?: string;
  nicheArchived?: boolean;
  nicheId?: string;
  selectedId?: string;
}) {
  const data = await getMarket(
    userId,
    search,
    archived,
    cursor,
    nicheArchived,
    nicheId,
  );
  const params = new URLSearchParams({
    q: search,
    archived: String(archived),
    nicheArchived: String(nicheArchived),
    ...(cursor ? { cursor } : {}),
  });
  const base = nicheId
    ? `${explorationWorkspaceHref(nicheId, "audience")}?kind=business`
    : "/entrepreneurship/market";
  const filterHref = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (key !== "nicheArchived" && key !== "cursor") next.delete("cursor");
    next.set(key, value);
    return `${base}${base.includes("?") ? "&" : "?"}${next}`;
  };
  const selectionHref = (id?: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("selected", id);
    else next.delete("selected");
    return `${base}${base.includes("?") ? "&" : "?"}${next}`;
  };
  const selected = data.companies.find((company) => company.id === selectedId);
  return (
    <MarketFilters initial={params.toString()}>
      <div
        className={nicheId ? "direct-workspace audience-workspace" : undefined}
      >
        <header
          className={
            nicheId
              ? "workspace-heading"
              : "business-section-heading business-page-heading"
          }
        >
          <div>
            <p className="eyebrow">Audience · businesses</p>
            <h2>Know the businesses behind the need.</h2>
            <p>
              Keep useful identity and context. Conversations, observations and
              offers preserve what actually happened.
            </p>
          </div>
        </header>
        <AudienceNavigation kind="business" nicheId={nicheId} />
        {!nicheId && (
          <details className="business-disclosure mb-2xl">
            <summary>Browse explorations</summary>
            <section
              className={`business-niches business-zone business-zone--primary${nicheArchived ? "business-zone--archived" : ""}`}
              aria-label="Explorations"
            >
              <div className="business-row-heading">
                <h3>
                  <Compass aria-hidden="true" />
                  Your explorations
                </h3>
                <div className="business-actions">
                  <MarketArchiveLink
                    field="nicheArchived"
                    value={String(!nicheArchived)}
                    href={filterHref("nicheArchived", String(!nicheArchived))}
                  >
                    {nicheArchived
                      ? "Active explorations"
                      : "View archived explorations"}
                  </MarketArchiveLink>
                  <MarketForm kind="niche" />
                </div>
              </div>
              {data.niches.length ? (
                <div className="business-niche-grid">
                  {data.niches.map((niche) => (
                    <Link
                      key={niche.id}
                      href={`/entrepreneurship/market/niches/${niche.id}`}
                      className={`business-niche${nicheArchived ? "business-record--archived" : ""}`}
                    >
                      <span className="business-kicker">
                        {humanize(niche.direction)}
                      </span>
                      <h4>{niche.name}</h4>
                      <p>{niche.scope ?? "Scope not recorded yet."}</p>
                      <span className="business-meta">
                        {niche._count.companies}{" "}
                        {niche._count.companies === 1
                          ? "business"
                          : "businesses"}{" "}
                        <ArrowUpRight aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="business-inline-empty">
                  An exploration gives your research a boundary. Start with a
                  market you’re curious about.
                </p>
              )}
            </section>
          </details>
        )}
        <div
          className="workspace-split"
          data-detail={selected ? "open" : undefined}
        >
          <section
            className={`business-zone business-zone--ledger business-market-companies${archived ? "business-zone--archived" : ""}`}
          >
            <div className="business-row-heading business-market-heading">
              <h3>
                Businesses{" "}
                <span className="business-count">{data.companyCount}</span>
              </h3>
              <div className="business-actions">
                <MarketArchiveLink
                  field="archived"
                  value={String(!archived)}
                  href={filterHref("archived", String(!archived))}
                >
                  {archived ? "Active businesses" : "View archived businesses"}
                </MarketArchiveLink>
                <ExplorationCompanyForm />
                <MarketForm kind="company" niches={data.activeNiches} />
              </div>
            </div>
            <div className="business-company-results">
              <CompanySearch search={search} />
              {data.companies.length ? (
                <div className="business-company-list" aria-label="Businesses">
                  {data.companies.map((company) => (
                    <article
                      className="workspace-record-row"
                      data-selected={company.id === selectedId || undefined}
                      key={company.id}
                    >
                      <Link
                        key={company.id}
                        className={`business-company-row workspace-record-main${archived ? "business-record--archived" : ""}`}
                        href={
                          nicheId
                            ? selectionHref(company.id)
                            : `/entrepreneurship/market/companies/${company.id}`
                        }
                      >
                        <span className="business-monogram" aria-hidden="true">
                          {company.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h4>{company.name}</h4>
                          <p>
                            {company.notes ||
                              company.website ||
                              "No context recorded yet."}
                          </p>
                        </div>
                        <span className="business-company-niches">
                          {company.niches
                            .map((n) => n.niche.name)
                            .join(" · ") || "No exploration linked"}
                          <span className="business-meta mt-sm">
                            {!nicheId &&
                            data.contact.find((c) => c.companyId === company.id)
                              ? `Last contact ${businessDate(data.contact.find((c) => c.companyId === company.id)!.lastContact)}`
                              : nicheId
                                ? "In this exploration"
                                : "No contact recorded"}
                          </span>
                          {!nicheId &&
                            data.followUps.find(
                              (f) => f.companyId === company.id,
                            ) && (
                              <span className="business-meta mt-sm">
                                Next:{" "}
                                {
                                  data.followUps.find(
                                    (f) => f.companyId === company.id,
                                  )!.title
                                }
                              </span>
                            )}
                        </span>
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="business-empty">
                  <Building2 aria-hidden="true" />
                  <h3>
                    {search
                      ? "No businesses match that search."
                      : archived
                        ? "No archived businesses."
                        : "Keep a business when it helps."}
                  </h3>
                  <p>
                    {search
                      ? "Try a shorter name or clear the search."
                      : "A name is enough to begin. Add context as you learn."}
                  </p>
                </div>
              )}
              <div className="business-company-pagination">
                {data.next && (
                  <Link
                    className="business-text-link"
                    scroll={false}
                    href={`${filterHref("cursor", data.next)}`}
                  >
                    Next businesses →
                  </Link>
                )}
              </div>
            </div>
          </section>
          {selected && nicheId && (
            <aside
              className="workspace-inspector"
              aria-label="Selected business"
            >
              <header className="workspace-inspector-heading">
                <div>
                  <p className="eyebrow">Business</p>
                  <h3>{selected.name}</h3>
                </div>
                <Link
                  className="business-icon-button"
                  href={selectionHref()}
                  scroll={false}
                  aria-label="Close business preview"
                >
                  <X aria-hidden="true" />
                </Link>
              </header>
              <div className="workspace-inspector-body">
                <p className="business-prose">
                  {selected.notes ||
                    selected.website ||
                    "No extra context recorded."}
                </p>
                <dl className="workspace-inspector-facts">
                  <div>
                    <dt>Explorations</dt>
                    <dd>{selected.niches.length}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {data.contact.find(
                        (item) => item.companyId === selected.id,
                      )
                        ? businessDate(
                            data.contact.find(
                              (item) => item.companyId === selected.id,
                            )!.lastContact,
                          )
                        : "Not yet"}
                    </dd>
                  </div>
                </dl>
              </div>
              <Link
                className="workspace-inspector-primary"
                href={withExplorationReturn(
                  explorationWorkspaceHref(
                    nicheId,
                    "audience",
                    `/businesses/${selected.id}`,
                  ),
                  selectionHref(selected.id),
                )}
              >
                Open full record <ArrowRight aria-hidden="true" />
              </Link>
            </aside>
          )}
        </div>
      </div>
    </MarketFilters>
  );
}
