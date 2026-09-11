"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  ImageOff,
  RotateCcw,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  CotsCandidatePage,
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";
import { cotsSourceStatusMessage } from "@/features/seasons/discovery/utils/cots-source-status.util";
import { cn } from "@/lib/styles/utils/class-name.util";

function selectionLabel(selection?: CotsSelectionView) {
  if (!selection) return null;
  if (selection.status === "SELECTED") return "Selected";
  if (selection.status === "PENDING") return "Waiting to import";
  if (selection.status === "IMPORTING") return "Importing";
  if (selection.status === "READY") return "Ready";
  return "Import failed";
}

function ImageCandidateCard({
  candidate,
  selection,
  pending,
  tabIndex,
  onFocus,
  onKeyMove,
  onToggle,
  onRetry,
  suppressPointerSelection,
  buttonRef,
}: {
  candidate: CotsCandidateView;
  selection?: CotsSelectionView;
  pending: boolean;
  tabIndex: number;
  onFocus: () => void;
  onKeyMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onRetry: () => void;
  suppressPointerSelection: () => boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selected = Boolean(selection);
  const status = selectionLabel(selection);
  const locked = selection && selection.status !== "SELECTED";

  return (
    <article
      className={cn("cots-image-card", selected && "is-selected")}
      data-status={selection?.status.toLowerCase()}
    >
      <button
        ref={buttonRef}
        type="button"
        className="cots-image-choice"
        aria-pressed={selected}
        aria-label={`${selected ? "Remove" : "Select"} ${candidate.title}`}
        disabled={!candidate.importable || pending || Boolean(locked)}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onClick={(event) => {
          if (event.detail > 0 && suppressPointerSelection()) return;
          onToggle();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            onKeyMove(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (detailsRef.current) detailsRef.current.open = true;
            detailsRef.current
              ?.querySelector<HTMLElement>("summary")
              ?.focus({ preventScroll: true });
          }
        }}
      >
        <span className="cots-image-frame">
          {candidate.previewHref ? (
            // Discovery previews may be remote; originals are imported only
            // after explicit confirmation by the authenticated server route.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.previewHref} alt={candidate.title} />
          ) : (
            <span className="cots-image-missing" aria-hidden="true">
              <ImageOff />
            </span>
          )}
          {selected && (
            <span className="cots-image-check" aria-hidden="true">
              <Check />
            </span>
          )}
          {pending && <span className="cots-image-pending">Saving…</span>}
        </span>
      </button>

      <div className="cots-image-card-copy">
        <div>
          <strong>{candidate.title}</strong>
          <small>
            {candidate.credit || candidate.provider}
            {candidate.sourceWork ? ` · ${candidate.sourceWork}` : ""}
          </small>
        </div>
        {status && <span className="cots-status-chip">{status}</span>}
      </div>

      {!candidate.importable && (
        <p className="cots-card-note">
          {candidate.unavailableReason || "This source cannot be imported."}
        </p>
      )}
      {selection?.status === "FAILED" && (
        <button className="cots-card-retry" type="button" onClick={onRetry}>
          <RotateCcw aria-hidden="true" /> Retry import
        </button>
      )}
      <details ref={detailsRef} className="cots-source-details">
        <summary>Source details</summary>
        <dl>
          <div>
            <dt>Provider</dt>
            <dd>{candidate.provider}</dd>
          </div>
          {candidate.credit && (
            <div>
              <dt>Credit</dt>
              <dd>{candidate.credit}</dd>
            </div>
          )}
          {candidate.license && (
            <div>
              <dt>License</dt>
              <dd>{candidate.license}</dd>
            </div>
          )}
          {candidate.width && candidate.height && (
            <div>
              <dt>Size</dt>
              <dd>
                {candidate.width} × {candidate.height}
              </dd>
            </div>
          )}
        </dl>
        <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">
          Open source <ExternalLink aria-hidden="true" />
        </a>
      </details>
    </article>
  );
}

export function CotsImageRail({
  page,
  selections,
  pendingCandidateRefs,
  discovering,
  onToggle,
  onRetry,
  onLoadMore,
}: {
  page: CotsCandidatePage | null;
  selections: CotsSelectionView[];
  pendingCandidateRefs: Set<string>;
  discovering: boolean;
  onToggle: (candidate: CotsCandidateView, selected: boolean) => void;
  onRetry: (selectionId: string) => void;
  onLoadMore: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef({ pointerId: -1, x: 0, scrollLeft: 0, moved: false });
  const suppressClickRef = useRef(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const selectionByRef = useMemo(
    () =>
      new Map(
        selections
          .filter(({ candidate }) => candidate.form === "IMAGE")
          .map((selection) => [selection.candidate.candidateRef, selection]),
      ),
    [selections],
  );

  const scroll = (direction: -1 | 1) => {
    railRef.current?.scrollBy({
      left: direction * railRef.current.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  const focus = (index: number) => {
    if (!page?.items.length) return;
    const next = (index + page.items.length) % page.items.length;
    setFocusIndex(next);
    buttonRefs.current[next]?.focus({ preventScroll: true });
    buttonRefs.current[next]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <div className="cots-image-browser">
      <div className="cots-rail-heading">
        <p>
          {page?.items.length
            ? `${page.items.length} possibilities`
            : discovering
              ? "Looking for possibilities…"
              : "No image suggestions yet"}
        </p>
        <div aria-label="Browse images">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous images"
            disabled={!page?.items.length}
            onClick={() => scroll(-1)}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next images"
            disabled={!page?.items.length}
            onClick={() => scroll(1)}
          >
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        ref={railRef}
        className="cots-image-rail"
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag.pointerId !== event.pointerId) return;
          const delta = event.clientX - drag.x;
          if (Math.abs(delta) > 6) drag.moved = true;
          if (drag.moved)
            event.currentTarget.scrollLeft = drag.scrollLeft - delta;
        }}
        onPointerUp={(event) => {
          if (dragRef.current.pointerId !== event.pointerId) return;
          suppressClickRef.current = dragRef.current.moved;
          dragRef.current.pointerId = -1;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current.pointerId = -1;
        }}
      >
        {page?.items.map((candidate, index) => {
          const selection = selectionByRef.get(candidate.candidateRef);
          return (
            <ImageCandidateCard
              key={candidate.candidateRef}
              candidate={candidate}
              selection={selection}
              pending={pendingCandidateRefs.has(candidate.candidateRef)}
              tabIndex={index === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(index)}
              onKeyMove={(direction) => focus(index + direction)}
              onToggle={() => onToggle(candidate, !selection)}
              onRetry={() => selection && onRetry(selection.id)}
              suppressPointerSelection={() => {
                const suppressed = suppressClickRef.current;
                suppressClickRef.current = false;
                return suppressed;
              }}
              buttonRef={(node) => {
                buttonRefs.current[index] = node;
              }}
            />
          );
        })}
        {discovering && (
          <div
            className="cots-image-card cots-image-skeleton"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        )}
        {page && !page.exhausted && page.nextCursor && (
          <div className="cots-load-more-card">
            <p>There may be more beyond this set.</p>
            <Button
              type="button"
              variant="secondary"
              disabled={discovering}
              onClick={onLoadMore}
            >
              {discovering ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
        {page?.exhausted && (
          <div className="cots-load-more-card">
            <Check aria-hidden="true" />
            <p>You’ve reached the end of this search.</p>
          </div>
        )}
      </div>

      {page?.sources.some(({ status }) => status !== "AVAILABLE") && (
        <div className="cots-source-notices" aria-label="Source availability">
          {page.sources
            .filter(({ status }) => status !== "AVAILABLE")
            .map((source) => (
              <p key={source.provider}>
                {cotsSourceStatusMessage(
                  source.provider,
                  source.status,
                  "images",
                )}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
