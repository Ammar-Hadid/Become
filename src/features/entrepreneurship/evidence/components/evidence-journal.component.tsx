import { Eye, Globe, MessagesSquare, ArrowUpRight } from "lucide-react";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import type { EvidenceScope } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";

export type EvidenceJournalData = Awaited<
  ReturnType<typeof getEvidenceJournal>
>;

export function EvidenceJournal({
  data,
  paginationHref,
  mode = "legacy",
  nicheId,
  query = {},
}: {
  data: EvidenceJournalData;
  paginationHref?: string;
  mode?: "legacy" | "sources" | "observations";
  nicheId?: string;
  query?: EvidenceScope;
}) {
  const collectionQuery = new URLSearchParams();
  if (query.q) collectionQuery.set("q", query.q);
  if (query.sourceKind) collectionQuery.set("sourceKind", query.sourceKind);
  if (query.marketType) collectionQuery.set("marketType", query.marketType);
  if (query.segmentId) collectionQuery.set("segmentId", query.segmentId);
  if (query.personId) collectionQuery.set("personId", query.personId);
  if (query.companyId) collectionQuery.set("companyId", query.companyId);
  if (query.cursor) collectionQuery.set("cursor", query.cursor);
  if (query.expandedInteractionId)
    collectionQuery.set("selected", query.expandedInteractionId);
  const collectionHref = nicheId
    ? `${explorationWorkspaceHref(nicheId, "evidence")}${collectionQuery.size ? `?${collectionQuery}` : ""}`
    : "/entrepreneurship/evidence";
  return (
    <>
      {data.entries.length ? (
        <div className="business-journal">
          {data.entries.map((entry) => {
            const Icon =
              entry.type === "INTERACTION"
                ? MessagesSquare
                : entry.sourceKind === "PUBLIC_SOURCE"
                  ? Globe
                  : Eye;
            const legacyHref = `/entrepreneurship/${entry.type === "INTERACTION" ? "interactions" : "observations"}/${entry.id}`;
            const rawFullHref = nicheId
              ? entry.type === "INTERACTION"
                ? explorationWorkspaceHref(
                    nicheId,
                    "conversations",
                    `/${entry.id}`,
                  )
                : explorationWorkspaceHref(
                    nicheId,
                    "evidence",
                    `/observations/${entry.id}`,
                  )
              : legacyHref;
            const fullHref = nicheId
              ? withExplorationReturn(rawFullHref, collectionHref)
              : rawFullHref;
            const inspectQuery = new URLSearchParams();
            if (query.q) inspectQuery.set("q", query.q);
            if (query.sourceKind)
              inspectQuery.set("sourceKind", query.sourceKind);
            if (query.marketType)
              inspectQuery.set("marketType", query.marketType);
            if (query.segmentId) inspectQuery.set("segmentId", query.segmentId);
            if (query.personId) inspectQuery.set("personId", query.personId);
            if (query.companyId) inspectQuery.set("companyId", query.companyId);
            if (query.cursor) inspectQuery.set("cursor", query.cursor);
            if (entry.type === "INTERACTION")
              inspectQuery.set("selected", entry.id);
            const expanded =
              entry.type === "INTERACTION" &&
              query.expandedInteractionId === entry.id;
            const inspectHref =
              nicheId && entry.type === "INTERACTION"
                ? `${explorationWorkspaceHref(nicheId, "evidence")}?${inspectQuery}`
                : fullHref;
            return (
              <article
                key={`${entry.type}-${entry.id}`}
                className="business-journal-entry"
              >
                <div className="business-journal-marker">
                  <Icon aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="business-meta">
                    <span>
                      {humanize(entry.interactionKind ?? entry.sourceKind)}
                    </span>
                    <span>·</span>
                    <time dateTime={entry.occurredAt.toISOString()}>
                      {businessDate(entry.occurredAt)}
                    </time>
                    {entry.wordingMode && (
                      <span>· {humanize(entry.wordingMode)}</span>
                    )}
                  </div>
                  <Link
                    className="business-journal-title"
                    href={inspectHref}
                    aria-expanded={
                      entry.type === "INTERACTION" ? expanded : undefined
                    }
                  >
                    {entry.title}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <p className="mt-sm text-body-sm text-text-secondary">
                    <AudienceSummary {...entry} />
                  </p>
                  {entry.audienceContext?.description && (
                    <p className="mt-sm text-body-sm text-text-muted">
                      {entry.audienceContext.description}
                    </p>
                  )}
                  {entry.observations.length > 0 && (
                    <details className="business-disclosure mt-lg">
                      <summary>
                        {entry.observations.length}{" "}
                        {entry.observations.length === 1
                          ? "observation"
                          : "observations"}{" "}
                        kept from this interaction
                      </summary>
                      <div>
                        {entry.observations.map((observation) => (
                          <article
                            key={observation.observationId}
                            className="border-border pb-lg border-b last:border-0"
                          >
                            <p className="business-prose">
                              {observation.wordingMode === "QUOTE"
                                ? `“${observation.statement}”`
                                : observation.statement}
                            </p>
                            {observation.sourceKind === "MESSAGE" && (
                              <p className="business-meta mt-sm">
                                Conversation excerpt · explicitly kept as an
                                observation
                              </p>
                            )}
                            <p className="mt-sm text-body-sm text-text-secondary">
                              <AudienceSummary {...observation} />
                            </p>
                            {observation.audienceContextId !==
                              entry.audienceContext?.id && (
                              <p className="mt-sm text-body-sm text-text-muted">
                                Audience attributed from this source
                                {observation.audienceContext?.description
                                  ? ` · ${observation.audienceContext.description}`
                                  : ""}
                              </p>
                            )}
                            <Link
                              className="business-text-link mt-sm"
                              href={
                                nicheId
                                  ? withExplorationReturn(
                                      explorationWorkspaceHref(
                                        nicheId,
                                        "evidence",
                                        `/observations/${observation.observationId}`,
                                      ),
                                      collectionHref,
                                    )
                                  : `/entrepreneurship/observations/${observation.observationId}`
                              }
                            >
                              Read observation{" "}
                              <ArrowUpRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
                  {entry.omittedObservations > 0 && (
                    <p className="mt-lg text-body-sm text-text-secondary">
                      {entry.omittedObservations} more observations ·{" "}
                      <Link className="business-text-link" href={fullHref}>
                        Open conversation →
                      </Link>
                    </p>
                  )}
                </div>
                {expanded && entry.type === "INTERACTION" && (
                  <Link className="business-journal-full-link" href={fullHref}>
                    Open full conversation <ArrowUpRight aria-hidden="true" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="business-empty">
          <MessagesSquare aria-hidden="true" />
          <h3>
            {mode === "observations"
              ? "No observations in this view yet."
              : mode === "sources"
                ? "No sources in this view yet."
                : "No evidence in this view yet."}
          </h3>
          <p>
            {mode === "observations"
              ? "Keep an exact conversation message, a direct observation, or a useful statement from a public source."
              : mode === "sources"
                ? "Start a conversation or keep a direct or public source. Source records stay separate from the observations you draw from them."
                : "Keep what someone shared, something you observed, or a public source. You can leave identities unnamed and the audience undecided."}
          </p>
        </div>
      )}
      {data.next && paginationHref && (
        <Link className="business-text-link mt-xl" href={paginationHref}>
          Earlier evidence →
        </Link>
      )}
    </>
  );
}
