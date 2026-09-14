import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import {
  EvidenceJournal,
  type EvidenceJournalData,
} from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { BatchOutreachForm } from "@/features/entrepreneurship/interactions/components/batch-outreach-form.component";
import type { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import type { EvidenceScope } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";

export function EvidencePage({
  data,
  options,
  nicheId,
  query = {},
}: {
  data: EvidenceJournalData;
  options: Awaited<ReturnType<typeof getInteractionOptions>>;
  nicheId?: string;
  query?: EvidenceScope;
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
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">What you heard, saw, and found</p>
          <h2>Keep the detail that matters.</h2>
          <p>
            A journal of actual sources. Conversations and their observations
            stay together.
          </p>
        </div>
        <EvidenceCapture {...options} />
      </header>
      <section className="business-zone business-zone--ledger">
        <div className="business-row-heading">
          <div>
            <p className="eyebrow">Evidence journal</p>
            <h3>
              {nicheId ? "In this exploration" : "Across every exploration"}
            </h3>
          </div>
          <Link
            className="business-text-link"
            href="/entrepreneurship/evidence"
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
              <option value="">All sources</option>
              <option value="INTERACTION">Conversations & interactions</option>
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
        <EvidenceJournal data={data} paginationHref={`?${next}`} />
      </section>
      <details className="business-disclosure business-zone">
        <summary>Outreach & contact activity</summary>
        <div>
          <p className="business-hint">
            Record what you actually sent or received. A research session does
            not imply contact happened.
          </p>
          <div className="business-actions">
            <InteractionForm
              {...options}
              initialKind="OUTREACH_SENT"
              triggerLabel="Record outreach or reply"
            />
            <BatchOutreachForm
              companies={options.companies}
              people={options.people}
              segments={options.segments}
            />
          </div>
        </div>
      </details>
    </>
  );
}
