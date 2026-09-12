"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Quote,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  CotsCandidatePage,
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import { COTS_DISCOVERY_ISSUE_MESSAGE } from "@/features/seasons/discovery/utils/cots-source-status.util";
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
  const pageKey = page?.queryKey ?? "pending";
  const [position, setPosition] = useState({ pageKey, index: 0 });
  const candidates =
    page?.items.filter(
      (candidate) =>
        candidate.form !== "SOURCE_LINK" && Boolean(candidate.text?.trim()),
    ) ?? [];
  const sourceLinks = [
    ...new Map(
      (page?.items ?? [])
        .filter(
          (candidate) =>
            candidate.form === "SOURCE_LINK" && Boolean(candidate.sourceUrl),
        )
        .map((candidate) => [candidate.sourceUrl, candidate]),
    ).values(),
  ];
  const hasMore = Boolean(page && !page.exhausted && page.nextCursor);
  const lastIndex = Math.max(0, candidates.length - 1 + (hasMore ? 1 : 0));
  const activeIndex =
    position.pageKey === pageKey ? Math.min(position.index, lastIndex) : 0;
  const activeCandidate = candidates[activeIndex];
  const loadMoreActive = hasMore && activeIndex === candidates.length;
  const selectionByRef = new Map(
    selections
      .filter(({ candidate }) => candidate.form !== "IMAGE")
      .map((selection) => [selection.candidate.candidateRef, selection]),
  );
  const sourceIssue = Boolean(
    page && page.sources.some(({ status }) => status !== "AVAILABLE"),
  );
  const move = (nextIndex: number) =>
    setPosition({
      pageKey,
      index: Math.max(0, Math.min(nextIndex, lastIndex)),
    });

  const activeSelection = activeCandidate
    ? selectionByRef.get(activeCandidate.candidateRef)
    : undefined;
  const selected = Boolean(activeSelection);

  return (
    <div className="cots-word-browser">
      <div className="cots-word-gallery">
        <header className="cots-word-gallery-nav">
          <div>
            <span>Curated words</span>
            <p aria-live="polite">
              {loadMoreActive
                ? `${candidates.length} viewed`
                : candidates.length
                  ? `${activeIndex + 1} of ${candidates.length}`
                  : discovering
                    ? "Searching the archives…"
                    : "No words found"}
            </p>
          </div>
          <div aria-label="Browse quotes">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Previous quote"
              disabled={activeIndex === 0}
              onClick={() => move(activeIndex - 1)}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Next quote"
              disabled={
                activeIndex === lastIndex ||
                (!activeCandidate && !loadMoreActive)
              }
              onClick={() => move(activeIndex + 1)}
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="cots-word-stage">
          {activeCandidate ? (
            <>
              <article
                key={activeCandidate.candidateRef}
                className={cn("cots-word-frame", selected && "is-selected")}
                aria-label={`Quote ${activeIndex + 1} of ${candidates.length}`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    move(activeIndex + (event.key === "ArrowLeft" ? -1 : 1));
                  }
                }}
              >
                <div className="cots-word-frame-bezel">
                  <span
                    className="cots-word-frame-ornament"
                    aria-hidden="true"
                  />
                  <span
                    className="cots-word-frame-corners"
                    aria-hidden="true"
                  />
                  <div className="cots-word-frame-liner">
                    <div className="cots-word-canvas">
                      <header>
                        <span>
                          {COTS_TEXT_FORM_LABEL[activeCandidate.form]}
                        </span>
                        <span>
                          {
                            COTS_CANDIDATE_EVIDENCE_LABEL[
                              activeCandidate.evidence
                            ]
                          }
                        </span>
                      </header>

                      {activeCandidate.text ? (
                        activeCandidate.form === "PASSAGE" ? (
                          <p className="cots-passage">{activeCandidate.text}</p>
                        ) : (
                          <blockquote>
                            <Quote aria-hidden="true" />
                            <p>“{activeCandidate.text}”</p>
                          </blockquote>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>

              <div className="cots-word-provenance">
                <div className="cots-word-plaque">
                  <div>
                    <strong>
                      {activeCandidate.speaker ||
                        activeCandidate.credit ||
                        activeCandidate.title}
                    </strong>
                    <small>
                      {[
                        activeCandidate.sourceWork,
                        activeCandidate.sourceDetail,
                      ]
                        .filter(Boolean)
                        .join(" · ") || activeCandidate.provider}
                    </small>
                    <small>
                      {activeCandidate.provider}
                      {activeCandidate.language
                        ? ` · ${activeCandidate.language}`
                        : ""}
                    </small>
                  </div>
                  <Button
                    className="cots-word-keep-action"
                    type="button"
                    variant={selected ? "secondary" : "ghost"}
                    disabled={
                      !activeCandidate.importable ||
                      pendingCandidateRefs.has(activeCandidate.candidateRef) ||
                      Boolean(
                        activeSelection &&
                        activeSelection.status !== "SELECTED",
                      )
                    }
                    aria-pressed={selected}
                    onClick={() => onToggle(activeCandidate, !selected)}
                  >
                    {selected && <Check aria-hidden="true" />}
                    {selected ? "Kept in season" : "Keep in this season"}
                  </Button>
                </div>

                <details className="cots-source-details cots-word-source-details">
                  <summary>Source details</summary>
                  <dl>
                    <div>
                      <dt>Provider</dt>
                      <dd>{activeCandidate.provider}</dd>
                    </div>
                    {activeCandidate.sourceWork && (
                      <div>
                        <dt>Work</dt>
                        <dd>{activeCandidate.sourceWork}</dd>
                      </div>
                    )}
                    {activeCandidate.sourceDetail && (
                      <div>
                        <dt>Evidence</dt>
                        <dd>{activeCandidate.sourceDetail}</dd>
                      </div>
                    )}
                  </dl>
                  <a
                    href={activeCandidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source <ExternalLink aria-hidden="true" />
                  </a>
                </details>
                {!activeCandidate.importable && (
                  <p className="cots-card-note">
                    {activeCandidate.unavailableReason ||
                      "This wording is available for review only."}
                  </p>
                )}
                {activeSelection?.status === "FAILED" && (
                  <button
                    className="cots-card-retry"
                    type="button"
                    onClick={() => onRetry(activeSelection.id)}
                  >
                    <RotateCcw aria-hidden="true" /> Retry
                  </button>
                )}
              </div>
            </>
          ) : loadMoreActive ? (
            <div
              className="cots-word-frame cots-word-continuation"
              aria-label="Load more quotes"
              aria-busy={discovering || undefined}
            >
              <div className="cots-word-frame-bezel">
                <span className="cots-word-frame-ornament" aria-hidden="true" />
                <span className="cots-word-frame-corners" aria-hidden="true" />
                <div className="cots-word-frame-liner">
                  <div className="cots-word-canvas cots-word-continuation-canvas">
                    <header>
                      <span>Current selection complete</span>
                      <span>More available</span>
                    </header>
                    <div>
                      <Quote aria-hidden="true" />
                      <strong>More words await</strong>
                      <p>
                        You’ve reached the end of these quotations. Continue
                        into the next selection when you’re ready.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={discovering}
                        onClick={onLoadMore}
                      >
                        {discovering ? "Loading more…" : "Load more quotes"}
                        {!discovering && <ArrowRight aria-hidden="true" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : discovering ? (
            <div
              className="cots-word-frame cots-word-skeleton"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>
          ) : null}
        </div>
      </div>

      {page?.exhausted && candidates.length > 0 && (
        <p className="cots-word-end">
          <Check aria-hidden="true" /> You’ve reached the end of this source.
        </p>
      )}
      {page?.exhausted && !candidates.length && (
        <>
          <div className="cots-word-empty">
            <p>
              {sourceIssue
                ? COTS_DISCOVERY_ISSUE_MESSAGE
                : "No matching words were found in the current sources."}
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={discovering}
              onClick={onRetryDiscovery}
            >
              <RotateCcw aria-hidden="true" />
              {discovering ? "Retrying…" : "Search again"}
            </Button>
          </div>
          {sourceLinks.length > 0 && (
            <details className="cots-source-details cots-word-recovery-sources">
              <summary>Review available sources</summary>
              <ul>
                {sourceLinks.map((source) => (
                  <li key={source.sourceUrl}>
                    <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                      {source.sourceWork || source.provider} source
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {sourceIssue && candidates.length > 0 && (
        <div className="cots-source-notices" aria-label="Source availability">
          <p>{COTS_DISCOVERY_ISSUE_MESSAGE}</p>
        </div>
      )}
    </div>
  );
}
