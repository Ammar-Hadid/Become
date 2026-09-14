import { ArrowUpRight, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  AudienceForm,
  AttachAudienceForm,
} from "@/features/entrepreneurship/audiences/components/audience-forms.component";
import { marketTypeLabel } from "@/features/entrepreneurship/audiences/utils/audience-label.util";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import type {
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
    <nav aria-label="Audience records" className="mb-2xl gap-sm flex flex-wrap">
      {(
        [
          ["segment", "Segments", "/audience"],
          ["person", "People", "/audience?kind=person"],
          ["business", "Businesses", nicheId ? "/companies" : "/market"],
        ] as const
      ).map(([value, label, path]) => (
        <Link
          key={value}
          href={
            nicheId
              ? explorationHref(nicheId, path)
              : `/entrepreneurship${path}`
          }
          aria-current={value === kind ? "page" : undefined}
          className={`px-lg py-sm text-body rounded-full border ${value === kind ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-text-secondary hover:bg-surface-elevated"}`}
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
}: {
  data: Awaited<ReturnType<typeof getAudienceRecords>>;
  options?: Awaited<ReturnType<typeof getAudienceOptions>>;
  kind?: "person" | "segment";
  nicheId?: string;
  search?: string;
  archived?: boolean;
}) {
  const base = nicheId
    ? explorationHref(nicheId, "/audience")
    : "/entrepreneurship/audience";
  const params = new URLSearchParams({
    kind,
    ...(search ? { q: search } : {}),
    ...(archived ? { archived: "true" } : {}),
  });
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">Who you want to understand</p>
          <h2>Who are you learning from?</h2>
          <p>
            Describe useful groups. Keep people and businesses when their
            identity helps you return to the conversation.
          </p>
        </div>
        <AudienceForm kind={kind} nicheId={nicheId} />
      </header>
      <AudienceNavigation kind={kind} nicheId={nicheId} />
      <section
        className={`business-zone business-zone--ledger${archived ? "business-zone--archived" : ""}`}
      >
        <div className="business-row-heading flex-wrap">
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
              className="text-input pl-4xl"
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
          <div className="grid">
            {data.records.map((record) => (
              <Link
                key={record.id}
                href={
                  nicheId
                    ? explorationHref(
                        nicheId,
                        `/${kind === "segment" ? "segments" : "people"}/${record.id}`,
                      )
                    : `/entrepreneurship/${kind === "segment" ? "segments" : "people"}/${record.id}`
                }
                className="gap-xl border-border py-xl flex items-center justify-between border-b last:border-0"
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
                <ArrowUpRight
                  className="text-text-muted size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            ))}
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
    </>
  );
}
