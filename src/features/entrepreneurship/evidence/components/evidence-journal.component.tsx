import { Eye, Globe, MessagesSquare, ArrowUpRight } from "lucide-react";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import type { getEvidenceJournal } from "@/features/entrepreneurship/evidence/queries/evidence-journal.query";

export type EvidenceJournalData = Awaited<
  ReturnType<typeof getEvidenceJournal>
>;

export function EvidenceJournal({
  data,
  paginationHref,
  mode = "legacy",
}: {
  data: EvidenceJournalData;
  paginationHref?: string;
  mode?: "legacy" | "sources" | "observations";
}) {
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
            const href = `/entrepreneurship/${entry.type === "INTERACTION" ? "interactions" : "observations"}/${entry.id}`;
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
                  <Link className="business-journal-title" href={href}>
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
                              href={`/entrepreneurship/observations/${observation.observationId}`}
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
                      <Link className="business-text-link" href={href}>
                        Open conversation →
                      </Link>
                    </p>
                  )}
                </div>
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
