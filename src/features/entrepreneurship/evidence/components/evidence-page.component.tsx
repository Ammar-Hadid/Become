import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import {
  EvidenceJournal,
  type EvidenceJournalData,
} from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import type { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import type { EvidenceScope } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import type { ReactNode } from "react";

export function EvidencePage({
  data,
  options,
  nicheId,
  query = {},
  mode = "legacy",
  navigation,
}: {
  data: EvidenceJournalData;
  options: Awaited<ReturnType<typeof getInteractionOptions>>;
  nicheId?: string;
  query?: EvidenceScope;
  mode?: "legacy" | "sources" | "observations";
  navigation?: ReactNode;
}) {
  const next = new URLSearchParams();
  for (const key of [
    "sourceKind",
    "marketType",
    "segmentId",
    "personId",
    "companyId",
  ] as const)
    if (query[key]) next.set(key, query[key]!);
  if (data.next) next.set("cursor", data.next);
  const personName = query.personId
    ? (options.people.find((person) => person.id === query.personId)?.name ??
      data.entries.find((entry) => entry.personId === query.personId)
        ?.personSnapshot ??
      "Selected person")
    : null;
  const businessName = query.companyId
    ? (options.companies.find((company) => company.id === query.companyId)
        ?.name ??
      data.entries.find((entry) => entry.companyId === query.companyId)
        ?.companySnapshot ??
      "Selected business")
    : null;
  const copy =
    mode === "sources"
      ? {
          title: "Keep the source before deciding what it means.",
          description:
            "Conversations, direct observations and public material stay traceable here. Turn the useful parts into explicit observations.",
          ledger: "Source ledger",
        }
      : mode === "observations"
        ? {
            title: "Keep only what you deliberately noticed.",
            description:
              "Every observation stands apart from its source, with wording and provenance preserved for later decisions.",
            ledger: "Observation ledger",
          }
        : {
            title: "Keep the detail that matters.",
            description:
              "A journal of actual sources. Conversations and their observations stay together.",
            ledger: "Evidence journal",
          };
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <div className="business-actions">
          {mode !== "legacy" && nicheId && (
            <Link
              className="finance-dialog-trigger finance-dialog-trigger--secondary"
              href={explorationHref(nicheId, "/learn/conversations")}
            >
              Start a conversation
            </Link>
          )}
          <EvidenceCapture
            {...options}
            triggerLabel={
              mode === "observations" ? "Keep observation" : undefined
            }
            captureLanes={
              mode === "legacy" ? undefined : ["observation", "public"]
            }
          />
        </div>
      </header>
      {navigation}
      <section className="business-zone business-zone--ledger">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">{copy.ledger}</p>
            <h3>
              {nicheId ? "In this exploration" : "Across every exploration"}
            </h3>
          </div>
          <Link
            className="business-text-link"
            href={
              nicheId && mode !== "legacy"
                ? explorationHref(
                    nicheId,
                    mode === "sources"
                      ? "/learn/sources"
                      : "/learn/observations",
                  )
                : "/entrepreneurship/evidence"
            }
          >
            Clear filters
          </Link>
        </div>
        {(personName || businessName) && (
          <p className="business-hint mb-xl">
            Showing source records for{" "}
            {[personName, businessName].filter(Boolean).join(" · ")}. Buying
            context remains specific to each recorded event.
          </p>
        )}
        <form className="mb-2xl gap-lg grid items-end sm:grid-cols-2 lg:grid-cols-4">
          <label className="field-label">
            Source
            <select
              name="sourceKind"
              className="text-input mt-sm"
              defaultValue={query.sourceKind ?? ""}
            >
              <option value="">
                {mode === "observations" ? "All observations" : "All sources"}
              </option>
              {mode !== "observations" && (
                <option value="INTERACTION">Conversations</option>
              )}
              {mode === "observations" && (
                <option value="MESSAGE">Conversation excerpts</option>
              )}
              <option value="DIRECT_OBSERVATION">Direct observations</option>
              <option value="PUBLIC_SOURCE">Public sources</option>
            </select>
          </label>
          <label className="field-label">
            Buying context
            <select
              name="marketType"
              className="text-input mt-sm"
              defaultValue={query.marketType ?? ""}
            >
              <option value="">All contexts</option>
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
              <option value="BOTH">Consumers & businesses</option>
            </select>
          </label>
          <label className="field-label">
            Segment
            <select
              name="segmentId"
              className="text-input mt-sm"
              defaultValue={query.segmentId ?? ""}
            >
              <option value="">All segments</option>
              {options.segments?.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
          {query.personId && (
            <input type="hidden" name="personId" value={query.personId} />
          )}
          {query.companyId && (
            <input type="hidden" name="companyId" value={query.companyId} />
          )}
          <button
            className="finance-dialog-trigger finance-dialog-trigger--secondary"
            type="submit"
          >
            Apply filters
          </button>
        </form>
        <EvidenceJournal data={data} paginationHref={`?${next}`} mode={mode} />
      </section>
    </>
  );
}
