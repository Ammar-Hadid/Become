"use client";

import { Check, ExternalLink, Quote, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  CotsCandidatePage,
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import { cotsSourceStatusMessage } from "@/features/seasons/discovery/utils/cots-source-status.util";
import {
  COTS_CANDIDATE_EVIDENCE_LABEL,
  COTS_TEXT_FORM_LABEL,
} from "@/features/seasons/discovery/utils/cots-text-label.util";
import { cn } from "@/lib/styles/utils/class-name.util";

export function CotsWordDeck({
  page,
  selections,
  pendingCandidateRefs,
  discovering,
  onToggle,
  onRetry,
  onRetryDiscovery,
  onLoadMore,
}: {
  page: CotsCandidatePage | null;
  selections: CotsSelectionView[];
  pendingCandidateRefs: Set<string>;
  discovering: boolean;
  onToggle: (candidate: CotsCandidateView, selected: boolean) => void;
  onRetry: (selectionId: string) => void;
  onRetryDiscovery: () => void;
  onLoadMore: () => void;
}) {
  const selectionByRef = new Map(
    selections
      .filter(({ candidate }) => candidate.form !== "IMAGE")
      .map((selection) => [selection.candidate.candidateRef, selection]),
  );
  const retryableDiscoveryFailure = Boolean(
    page &&
    !page.items.length &&
    page.sources.some(({ status }) =>
      ["THROTTLED", "UNAVAILABLE"].includes(status),
    ),
  );

  return (
    <div className="cots-word-browser">
      <div className="cots-word-deck">
        {page?.items.map((candidate) => {
          const selection = selectionByRef.get(candidate.candidateRef);
          const selected = Boolean(selection);
          const isSourceLink = candidate.form === "SOURCE_LINK";
          return (
            <article
              key={candidate.candidateRef}
              className={cn(
                "cots-word-card",
                selected && "is-selected",
                isSourceLink && "is-source-link",
              )}
            >
              <header>
                <span>{COTS_TEXT_FORM_LABEL[candidate.form]}</span>
                <span>{COTS_CANDIDATE_EVIDENCE_LABEL[candidate.evidence]}</span>
              </header>

              {candidate.text ? (
                candidate.form === "PASSAGE" ? (
                  <p className="cots-passage">{candidate.text}</p>
                ) : (
                  <blockquote>
                    <Quote aria-hidden="true" />
                    <p>“{candidate.text}”</p>
                  </blockquote>
                )
              ) : (
                <div className="cots-source-link-copy">
                  <strong>{candidate.title}</strong>
                  <p>
                    Review the original source before keeping any wording from
                    it.
                  </p>
                </div>
              )}

              <footer>
                <div>
                  <strong>
                    {candidate.speaker || candidate.credit || candidate.title}
                  </strong>
                  <small>
                    {[candidate.sourceWork, candidate.sourceDetail]
                      .filter(Boolean)
                      .join(" · ") || candidate.provider}
                  </small>
                  <small>
                    {candidate.provider}
                    {candidate.language ? ` · ${candidate.language}` : ""}
                  </small>
                </div>
                {isSourceLink ? (
                  <a
                    className="cots-word-source-action"
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source <ExternalLink aria-hidden="true" />
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant={selected ? "secondary" : "ghost"}
                    disabled={
                      !candidate.importable ||
                      pendingCandidateRefs.has(candidate.candidateRef) ||
                      Boolean(selection && selection.status !== "SELECTED")
                    }
                    aria-pressed={selected}
                    onClick={() => onToggle(candidate, !selected)}
                  >
                    {selected && <Check aria-hidden="true" />}
                    {selected ? "Kept in chapter" : "Keep in this chapter"}
                  </Button>
                )}
              </footer>
              {!isSourceLink && (
                <details className="cots-source-details cots-word-source-details">
                  <summary>Source details</summary>
                  <dl>
                    <div>
                      <dt>Provider</dt>
                      <dd>{candidate.provider}</dd>
                    </div>
                    {candidate.sourceWork && (
                      <div>
                        <dt>Work</dt>
                        <dd>{candidate.sourceWork}</dd>
                      </div>
                    )}
                    {candidate.sourceDetail && (
                      <div>
                        <dt>Evidence</dt>
                        <dd>{candidate.sourceDetail}</dd>
                      </div>
                    )}
                  </dl>
                  <a
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source <ExternalLink aria-hidden="true" />
                  </a>
                </details>
              )}
              {!candidate.importable && !isSourceLink && (
                <p className="cots-card-note">
                  {candidate.unavailableReason ||
                    "This wording is available for review only."}
                </p>
              )}
              {selection?.status === "FAILED" && (
                <button
                  className="cots-card-retry"
                  type="button"
                  onClick={() => onRetry(selection.id)}
                >
                  <RotateCcw aria-hidden="true" /> Retry
                </button>
              )}
            </article>
          );
        })}
        {discovering && (
          <div className="cots-word-card cots-word-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {page && !page.exhausted && page.nextCursor && (
        <Button
          className="cots-word-load-more"
          type="button"
          variant="secondary"
          disabled={discovering}
          onClick={onLoadMore}
        >
          {discovering ? "Loading…" : "Load more"}
        </Button>
      )}
      {page?.exhausted && page.items.length > 0 && (
        <p className="cots-word-end">
          <Check aria-hidden="true" /> You’ve reached the end of this source.
        </p>
      )}
      {page?.exhausted && !page.items.length && (
        <div className="cots-word-empty">
          <p>
            {retryableDiscoveryFailure
              ? "The quote sources did not complete this search."
              : "No matching words were found in the current sources."}
          </p>
          {retryableDiscoveryFailure && (
            <Button
              type="button"
              variant="secondary"
              disabled={discovering}
              onClick={onRetryDiscovery}
            >
              <RotateCcw aria-hidden="true" />
              {discovering ? "Retrying…" : "Retry search"}
            </Button>
          )}
        </div>
      )}
      {page?.sources.some(({ status }) => status !== "AVAILABLE") && (
        <div className="cots-source-notices" aria-label="Source availability">
          {page.sources
            .filter(({ status }) => status !== "AVAILABLE")
            .map((source) => (
              <p key={source.provider}>
                {cotsSourceStatusMessage(
                  source.provider,
                  source.status,
                  "words",
                )}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
