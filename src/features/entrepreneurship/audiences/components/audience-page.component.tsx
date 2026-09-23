import { ArrowRight, ArrowUpRight, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import {
  AudienceForm,
  AttachAudienceForm,
} from "@/features/entrepreneurship/audiences/components/audience-forms.component";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import type {
  getAudienceDetail,
  getAudienceRecords,
  getAudienceOptions,
} from "@/features/entrepreneurship/audiences/queries/audience.query";

export function AudienceNavigation({
  kind,
  nicheId,
}: {
  kind: "person" | "segment" | "business";
  nicheId?: string;
}) {
  return (
    <nav aria-label="Audience records" className="exploration-subnavigation">
      {(
        [
          ["segment", "Segments", nicheId ? "/audience" : "/audience"],
          [
            "person",
            "People",
            nicheId ? "/audience?kind=person" : "/audience?kind=person",
          ],
          [
            "business",
            "Businesses",
            nicheId ? "/audience?kind=business" : "/market",
          ],
        ] as const
      ).map(([value, label, path]) => (
        <Link
          key={value}
          href={
            nicheId
              ? `${explorationWorkspaceHref(nicheId, "audience")}${path.includes("?") ? path.slice(path.indexOf("?")) : ""}`
              : `/entrepreneurship${path}`
          }
          aria-current={value === kind ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AudiencePage({
  data,
  kind = "segment",
  nicheId,
  search = "",
  archived = false,
  selected,
  cursor,
}: {
  data: Awaited<ReturnType<typeof getAudienceRecords>>;
  options?: Awaited<ReturnType<typeof getAudienceOptions>>;
  kind?: "person" | "segment";
  nicheId?: string;
  search?: string;
  archived?: boolean;
  selected?: Awaited<ReturnType<typeof getAudienceDetail>> | null;
  cursor?: string;
}) {
  const base = nicheId
    ? explorationWorkspaceHref(nicheId, "audience")
    : "/entrepreneurship/audience";
  const params = new URLSearchParams({
    kind,
    ...(search ? { q: search } : {}),
    ...(archived ? { archived: "true" } : {}),
    ...(cursor ? { cursor } : {}),
  });
  const collectionHref = `${base}?${params}`;
  const selectedReturnTo = selected
    ? `${collectionHref}&selected=${encodeURIComponent(selected.record.id)}`
    : collectionHref;
  return (
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
          {nicheId && <p className="eyebrow">Audience</p>}
          <h2>Who are you learning from?</h2>
          <p>
            Describe useful groups. Keep people and businesses when their
            identity helps you return to the conversation.
          </p>
        </div>
        <AudienceForm kind={kind} nicheId={nicheId} />
      </header>
      <AudienceNavigation kind={kind} nicheId={nicheId} />
      <div
        className="workspace-split"
        data-detail={selected ? "open" : undefined}
      >
        <section
          className={`business-zone business-zone--ledger workspace-collection${archived ? "business-zone--archived" : ""}`}
        >
          <div className="business-row-heading audience-records-heading flex-wrap">
            <div>
              <p className="eyebrow">
                {kind === "segment"
                  ? "Audience boundaries"
                  : "Optional identities"}
              </p>
              <h3>
                {archived ? "Archived " : ""}
                {kind === "segment" ? "Segments" : "People"}
              </h3>
            </div>
            <div className="business-actions">
              {nicheId && <AttachAudienceForm kind={kind} nicheId={nicheId} />}
              <Link
                className="business-text-link"
                href={`${base}?${new URLSearchParams({ kind, ...(search ? { q: search } : {}), ...(!archived ? { archived: "true" } : {}) })}`}
              >
                {archived ? "View current" : "View archived"}
              </Link>
            </div>
          </div>
          <form action={base} className="mb-xl gap-sm flex items-center">
            <input type="hidden" name="kind" value={kind} />
            {archived && <input type="hidden" name="archived" value="true" />}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Search {kind === "segment" ? "segments" : "people"}
              </span>
              <Search
                className="left-lg text-text-muted absolute top-1/2 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                className="text-input audience-search-input pl-4xl"
                type="search"
                name="q"
                defaultValue={search}
                placeholder={`Search ${kind === "segment" ? "segments" : "people"}…`}
              />
            </label>
            <button
              type="submit"
              className="finance-dialog-trigger finance-dialog-trigger--secondary"
            >
              Search
            </button>
          </form>
          {data.records.length ? (
            <div className="workspace-record-list">
              {data.records.map((record) => {
                const quickParams = new URLSearchParams(params);
                quickParams.set("selected", record.id);
                return (
                  <article
                    key={record.id}
                    className="workspace-record-row"
                    data-selected={
                      selected?.record.id === record.id || undefined
                    }
                  >
                    <Link
                      href={`${base}?${quickParams}`}
                      scroll={false}
                      className="workspace-record-main"
                    >
                      <div className="min-w-0">
                        <p className="text-body-lg text-text-primary font-medium">
                          {record.name}
                        </p>
                        {"description" in record ? (
                          <>
                            <p className="mt-sm text-body text-text-secondary">
                              {record.description}
                            </p>
                            <p className="mt-sm text-body-sm text-text-muted">
                              {marketTypeLabel(record.marketType)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-sm text-body text-text-secondary">
                            {record.notes ||
                              record.email ||
                              "Identity kept; evidence stays in its source records."}
                          </p>
                        )}
                      </div>
                    </Link>
                    <Link
                      className="workspace-record-open"
                      aria-label={`Open ${record.name}`}
                      href={
                        nicheId
                          ? withExplorationReturn(
                              explorationWorkspaceHref(
                                nicheId,
                                "audience",
                                `/${kind === "segment" ? "segments" : "people"}/${record.id}`,
                              ),
                              collectionHref,
                            )
                          : `/entrepreneurship/${kind === "segment" ? "segments" : "people"}/${record.id}`
                      }
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="business-empty">
              <UsersRound aria-hidden="true" />
              <h3>
                {search
                  ? "No matching records."
                  : kind === "segment"
                    ? "Start with a useful group."
                    : "Keep an identity when it helps."}
              </h3>
              <p>
                {kind === "segment"
                  ? "For example, daily cloth-mousepad users or gaming cafés with shared equipment. You can keep evidence before choosing a segment."
                  : "People are optional. Anonymous interviews and aggregate sources can stay in the evidence journal without person records."}
              </p>
            </div>
          )}
          {data.next && (
            <Link
              className="business-text-link mt-xl"
              href={`${base}?${new URLSearchParams({ ...Object.fromEntries(params), cursor: data.next })}`}
            >
              More {kind === "segment" ? "segments" : "people"} →
            </Link>
          )}
        </section>
        {selected && (
          <aside
            className="workspace-inspector"
            aria-label="Selected audience record"
          >
            <header className="workspace-inspector-heading">
              <div>
                <p className="eyebrow">
                  {kind === "segment" ? "Audience segment" : "Person"}
                </p>
                <h3>{selected.record.name}</h3>
              </div>
              <Link
                href={`${base}?${params}`}
                scroll={false}
                className="business-icon-button"
                aria-label="Close details"
              >
                <X aria-hidden="true" />
              </Link>
            </header>
            <div className="workspace-inspector-body">
              <p className="business-prose">
                {"description" in selected.record
                  ? selected.record.description
                  : selected.record.notes ||
                    selected.record.email ||
                    "No extra context recorded."}
              </p>
              <dl className="workspace-inspector-facts">
                <div>
                  <dt>Evidence</dt>
                  <dd>{selected.evidence.entries.length}</dd>
                </div>
                <div>
                  <dt>Problems</dt>
                  <dd>{selected.problems.length}</dd>
                </div>
                <div>
                  <dt>Offers</dt>
                  <dd>{selected.offers.length}</dd>
                </div>
              </dl>
            </div>
            <Link
              className="workspace-inspector-primary"
              href={withExplorationReturn(
                explorationWorkspaceHref(
                  nicheId!,
                  "audience",
                  `/${kind === "segment" ? "segments" : "people"}/${selected.record.id}`,
                ),
                selectedReturnTo,
              )}
            >
              Open full record <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
