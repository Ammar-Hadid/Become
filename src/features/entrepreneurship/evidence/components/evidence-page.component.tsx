import { Card } from "@/components/ui/cards/card.component";
import { Input } from "@/components/ui/forms/input.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import {
  EvidenceJournal,
  type EvidenceJournalData,
} from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import type { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import type { EvidenceScope } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

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
  if (query.q) next.set("q", query.q);
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
          title: "Your sources",
          description:
            "Conversations, direct observations and public material stay traceable here. Turn the useful parts into explicit observations.",
          ledger: "Source ledger",
        }
      : mode === "observations"
        ? {
            title: "Your observations",
            description:
              "Every observation stands apart from its source, with wording and provenance preserved for later decisions.",
            ledger: "Observation ledger",
          }
        : {
            title: "Evidence",
            description:
              "A journal of actual sources. Conversations and their observations stay together.",
            ledger: "Evidence journal",
          };
  const directWorkspace = Boolean(nicheId && mode === "legacy");
  return (
    <div
      className={
        directWorkspace ? "direct-workspace evidence-workspace" : undefined
      }
    >
      <header
        className={
          directWorkspace
            ? "workspace-heading"
            : "business-section-heading business-page-heading"
        }
      >
        <div>
          {directWorkspace && <p className="eyebrow">Evidence</p>}
          <h2>{copy.title}</h2>
          <p>
            {directWorkspace
              ? "Trace sources and the observations kept from them."
              : copy.description}
          </p>
        </div>
        <div className="business-actions">
          {mode !== "legacy" && nicheId && (
            <Link
              className="become-button become-button--secondary become-button--md"
              href={explorationWorkspaceHref(nicheId, "conversations")}
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
      <Card
        material="glass"
        spacing="dense"
        className={
          directWorkspace
            ? "workspace-ledger"
            : "business-zone business-zone--ledger"
        }
      >
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
              nicheId
                ? explorationWorkspaceHref(nicheId, "evidence")
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
        <form
          className={
            directWorkspace
              ? "workspace-toolbar evidence-toolbar"
              : "mb-2xl gap-lg grid items-end sm:grid-cols-2 lg:grid-cols-4"
          }
        >
          {directWorkspace && (
            <label className="workspace-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search evidence</span>
              <Input
                name="q"
                type="search"
                defaultValue={query.q}
                placeholder="Search sources and observations"
              />
            </label>
          )}
          <label className="field-label">
            Source
            <NativeSelect
              name="sourceKind"
              className={directWorkspace ? undefined : "text-input mt-sm"}
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
            </NativeSelect>
          </label>
          <label className="field-label">
            Buying context
            <NativeSelect
              name="marketType"
              className={directWorkspace ? undefined : "text-input mt-sm"}
              defaultValue={query.marketType ?? ""}
            >
              <option value="">All contexts</option>
              <option value="UNKNOWN">Not sure yet</option>
              <option value="B2C">Consumers</option>
              <option value="B2B">Businesses</option>
              <option value="BOTH">Consumers & businesses</option>
            </NativeSelect>
          </label>
          <BusinessRecordPicker
            kind="segment"
            label="Segment"
            name="segmentId"
            nicheId={nicheId}
            options={options.segments}
            value={query.segmentId}
            placeholder="All segments"
          />
          {query.personId && (
            <input type="hidden" name="personId" value={query.personId} />
          )}
          {query.companyId && (
            <input type="hidden" name="companyId" value={query.companyId} />
          )}
          <Button variant="secondary" type="submit">
            Apply filters
          </Button>
        </form>
        <EvidenceJournal
          data={data}
          paginationHref={`?${next}`}
          mode={mode}
          nicheId={nicheId}
          query={query}
        />
      </Card>
    </div>
  );
}
