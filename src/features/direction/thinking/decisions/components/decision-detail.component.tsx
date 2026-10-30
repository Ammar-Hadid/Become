"use client";

import { Card } from "@/components/ui/cards/card.component";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Quote } from "lucide-react";
import { DecisionActions } from "@/features/direction/thinking/decisions/components/decision-actions.component";
import { DecisionDialog } from "@/features/direction/thinking/decisions/components/decision-editor.component";
import { DecisionReflection } from "@/features/direction/thinking/decisions/components/decision-reflection.component";
import { ThinkingPagination } from "@/features/direction/thinking/shared/components/thinking-pagination.component";
import type {
  DecisionView,
  ThinkingOptions,
} from "@/features/direction/thinking/types/thinking.types";

const assessmentLabel = {
  HELPFUL: "Helpful",
  MIXED: "Mixed",
  NOT_HELPFUL: "Not helpful",
  TOO_EARLY: "Too early to tell",
} as const;

function decisionSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = snapshot as Record<string, unknown>;
  const read = (key: string) =>
    typeof value[key] === "string" ? (value[key] as string) : "";
  const result = {
    choice: read("choice"),
    reason: read("reason"),
    context: read("context"),
    expectedOutcome: read("expectedOutcome"),
  };
  return Object.values(result).some(Boolean) ? result : null;
}

export function DecisionDetail({
  decision,
  options,
  defaultDecidedOn,
}: {
  decision: DecisionView;
  options: ThinkingOptions;
  defaultDecidedOn: string;
}) {
  return (
    <article className="thinking-detail decision-detail">
      <Link href="/direction/decisions" className="thinking-back-link">
        <ArrowLeft aria-hidden="true" /> Back to Decisions
      </Link>
      <header className="thinking-detail-header">
        <span className="thinking-detail-mark" aria-hidden="true">
          <Quote />
        </span>
        <div>
          <p className="eyebrow">Decision · version {decision.version}</p>
          <h1>{decision.choice}</h1>
          <p className="thinking-detail-date">
            Decided{" "}
            <time dateTime={decision.decidedOn}>
              {new Date(`${decision.decidedOn}T12:00:00`).toLocaleDateString(
                undefined,
                { dateStyle: "long" },
              )}
            </time>
            {decision.reviewOn ? (
              <>
                {" "}
                · Review{" "}
                <time dateTime={decision.reviewOn}>
                  {new Date(`${decision.reviewOn}T12:00:00`).toLocaleDateString(
                    undefined,
                    { dateStyle: "medium" },
                  )}
                </time>
              </>
            ) : null}
          </p>
        </div>
        <DecisionActions
          id={decision.id}
          version={decision.version}
          archived={Boolean(decision.archivedAt)}
        />
      </header>

      {decision.archivedAt && (
        <p className="thinking-archive-notice">
          This decision is resting in the archive. Restore it before revising it
          or adding another reflection.
        </p>
      )}

      <blockquote className="decision-reason">
        <p>{decision.reason}</p>
        <footer>Why this path</footer>
      </blockquote>

      {decision.links.length > 0 && (
        <nav className="decision-links" aria-label="Related work">
          <span>Related to</span>
          <ul>
            {decision.links.map((link) => (
              <li key={`${link.href}:${link.id}`}>
                <Link href={link.href}>
                  {link.label}
                  {link.archived ? " · Archived" : ""}{" "}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {(decision.context ||
        decision.alternatives ||
        decision.expectedOutcome ||
        decision.reconsiderWhen) && (
        <Card
          className="decision-context"
          aria-labelledby="decision-context-title"
        >
          <header>
            <p className="eyebrow">At the time</p>
            <h3 id="decision-context-title">The thinking around the choice.</h3>
          </header>
          <dl>
            {decision.context && (
              <div>
                <dt>Situation</dt>
                <dd>{decision.context}</dd>
              </div>
            )}
            {decision.alternatives && (
              <div>
                <dt>Alternatives considered</dt>
                <dd>{decision.alternatives}</dd>
              </div>
            )}
            {decision.expectedOutcome && (
              <div>
                <dt>Expected outcome</dt>
                <dd>{decision.expectedOutcome}</dd>
              </div>
            )}
            {decision.reconsiderWhen && (
              <div>
                <dt>Reconsider when</dt>
                <dd>{decision.reconsiderWhen}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {(decision.supersedes || decision.supersededBy) && (
        <aside className="decision-lineage" aria-label="Decision lineage">
          {decision.supersedes && (
            <p>
              Follows{" "}
              <Link href={decision.supersedes.href}>
                {decision.supersedes.label}
              </Link>
            </p>
          )}
          {decision.supersededBy && (
            <p>
              Followed by{" "}
              <Link href={decision.supersededBy.href}>
                {decision.supersededBy.label}
              </Link>
            </p>
          )}
        </aside>
      )}

      {!decision.archivedAt && (
        <section
          className="decision-next-actions"
          aria-label="Decision actions"
        >
          <DecisionReflection
            decisionId={decision.id}
            defaultReflectedOn={defaultDecidedOn}
          />
          <DecisionDialog
            mode="edit"
            decision={decision}
            options={options}
            defaultDecidedOn={defaultDecidedOn}
          />
          {!decision.supersededBy && (
            <DecisionDialog
              mode="follow-up"
              supersedes={decision}
              options={options}
              defaultDecidedOn={defaultDecidedOn}
            />
          )}
        </section>
      )}

      <Card
        className="decision-reflections"
        aria-labelledby="decision-reflections-title"
      >
        <header>
          <p className="eyebrow">After the choice</p>
          <h3 id="decision-reflections-title">
            {decision.reflections.length
              ? "What became clear."
              : "No reflection yet."}
          </h3>
        </header>
        {decision.reflections.length > 0 && (
          <ol>
            <ThinkingPagination
              key={`${decision.id}:reflections:${decision.reflections[0]?.id ?? "none"}:${decision.reflectionsNextCursor ?? "end"}`}
              kind="reflections"
              recordId={decision.id}
              initialItems={decision.reflections}
              initialCursor={decision.reflectionsNextCursor}
              moreLabel="Earlier reflections"
              renderItem={(reflection) => (
                <li key={reflection.id}>
                  <div>
                    <strong>{assessmentLabel[reflection.assessment]}</strong>
                    <time dateTime={reflection.reflectedOn}>
                      {new Date(
                        `${reflection.reflectedOn}T12:00:00`,
                      ).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </time>
                  </div>
                  <p>{reflection.reflection}</p>
                </li>
              )}
            />
          </ol>
        )}
      </Card>

      {decision.history.length > 0 && (
        <Card
          className="thinking-history"
          aria-labelledby="decision-history-title"
        >
          <header>
            <p className="eyebrow">Revision history</p>
            <h3 id="decision-history-title">
              The record keeps its earlier shape.
            </h3>
          </header>
          <ol>
            <ThinkingPagination
              key={`${decision.id}:history:${decision.version}:${decision.historyNextCursor ?? "end"}`}
              kind="decision"
              recordId={decision.id}
              initialItems={decision.history}
              initialCursor={decision.historyNextCursor}
              moreLabel="Earlier revisions"
              renderItem={(entry) => {
                const snapshot = decisionSnapshot(entry.snapshot);
                return (
                  <li key={entry.id}>
                    <div>
                      <span>
                        Version {entry.version}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </span>
                      {snapshot && (
                        <details className="thinking-history-copy">
                          <summary>Read saved wording</summary>
                          {snapshot.choice && (
                            <strong>{snapshot.choice}</strong>
                          )}
                          {snapshot.reason && <p>{snapshot.reason}</p>}
                          {snapshot.context && (
                            <p>
                              <b>Situation</b> {snapshot.context}
                            </p>
                          )}
                          {snapshot.expectedOutcome && (
                            <p>
                              <b>Expected</b> {snapshot.expectedOutcome}
                            </p>
                          )}
                        </details>
                      )}
                    </div>
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </li>
                );
              }}
            />
          </ol>
        </Card>
      )}
    </article>
  );
}
