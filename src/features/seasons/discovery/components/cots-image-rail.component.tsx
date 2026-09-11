"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  ImageOff,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  loadImmediately,
  tabIndex,
  onFocus,
  onKeyMove,
  onToggle,
  onRetry,
  buttonRef,
}: {
  candidate: CotsCandidateView;
  selection?: CotsSelectionView;
  pending: boolean;
  loadImmediately: boolean;
  tabIndex: number;
  onFocus: () => void;
  onKeyMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onRetry: () => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const selected = Boolean(selection);
  const status = selectionLabel(selection);
  const locked = selection && selection.status !== "SELECTED";
  const supportsLargePreview =
    candidate.provider === "zerochan" && Boolean(candidate.previewHref);
  const [largePreview, setLargePreview] = useState(
    supportsLargePreview && loadImmediately,
  );
  const previewHref = candidate.previewHref
    ? `${candidate.previewHref}${candidate.previewHref.includes("?") ? "&" : "?"}${largePreview ? "size=large" : "size=thumbnail"}`
    : null;
  const [previewLoad, setPreviewLoad] = useState<{
    href: string | null;
    state: "loading" | "ready" | "failed" | "missing";
  }>({
    href: previewHref,
    state: previewHref ? "loading" : "missing",
  });
  const previewState =
    previewLoad.href === previewHref
      ? previewLoad.state
      : previewHref
        ? "loading"
        : "missing";

  useEffect(() => {
    if (!supportsLargePreview || largePreview || !frameRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLargePreview(true);
        observer.disconnect();
      },
      { rootMargin: "160px" },
    );
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [largePreview, supportsLargePreview]);

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
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            onKeyMove(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <span
          ref={frameRef}
          className="cots-image-frame"
          aria-busy={previewState === "loading" || undefined}
        >
          {previewHref && previewState !== "failed" ? (
            // Discovery renditions stay behind the authenticated candidate route;
            // full originals are imported only after explicit confirmation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewHref}
              className={previewState === "ready" ? "is-loaded" : undefined}
              src={previewHref}
              alt={candidate.title}
              loading={loadImmediately ? "eager" : "lazy"}
              fetchPriority={loadImmediately ? "high" : "auto"}
              decoding="async"
              draggable={false}
              onLoad={() =>
                setPreviewLoad({ href: previewHref, state: "ready" })
              }
              onError={() =>
                setPreviewLoad({ href: previewHref, state: "failed" })
              }
            />
          ) : null}
          {previewState !== "ready" && (
            <span className="cots-image-missing" aria-hidden="true">
              {previewState === "loading" ? (
                <span>Loading preview…</span>
              ) : (
                <>
                  <ImageOff />
                  <span>
                    {previewState === "failed"
                      ? "Preview unavailable"
                      : "No preview available"}
                  </span>
                </>
              )}
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
      <details className="cots-source-details">
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
  const railRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    scrollLeft: 0,
    moved: false,
  });
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
  const retryableDiscoveryFailure = Boolean(
    page &&
    !page.items.length &&
    page.sources.some(({ status }) =>
      ["THROTTLED", "UNAVAILABLE"].includes(status),
    ),
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
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          suppressClickRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          suppressClickRef.current = false;
          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            scrollLeft: event.currentTarget.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag.pointerId !== event.pointerId) return;
          const deltaX = event.clientX - drag.x;
          const deltaY = event.clientY - drag.y;
          if (
            !drag.moved &&
            Math.abs(deltaX) > 6 &&
            Math.abs(deltaX) > Math.abs(deltaY)
          ) {
            drag.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (drag.moved) {
            event.preventDefault();
            event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
          }
        }}
        onPointerUp={(event) => {
          if (dragRef.current.pointerId !== event.pointerId) return;
          suppressClickRef.current = dragRef.current.moved;
          dragRef.current.pointerId = -1;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          if (suppressClickRef.current)
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
        }}
        onPointerCancel={() => {
          dragRef.current.pointerId = -1;
          suppressClickRef.current = false;
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
              loadImmediately={index < 4}
              tabIndex={index === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(index)}
              onKeyMove={(direction) => focus(index + direction)}
              onToggle={() => onToggle(candidate, !selection)}
              onRetry={() => selection && onRetry(selection.id)}
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
            {retryableDiscoveryFailure ? (
              <>
                <RotateCcw aria-hidden="true" />
                <p>The image sources did not complete this search.</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={discovering}
                  onClick={onRetryDiscovery}
                >
                  {discovering ? "Retrying…" : "Retry search"}
                </Button>
              </>
            ) : (
              <>
                <Check aria-hidden="true" />
                <p>You’ve reached the end of this search.</p>
              </>
            )}
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
