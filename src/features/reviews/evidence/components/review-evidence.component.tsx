"use client";

import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";

import Link from "next/link";
import { ArrowUpRight, FileSearch, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/buttons/button.component";
import { useModalLayer } from "@/components/ui/motion/hooks/use-modal-layer.hook";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import type {
  ReviewEvidencePage,
  ReviewMetric,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import styles from "../styles/review-evidence.module.css";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { formatMoney } from "@/lib/money/utils/money.util";

export function ReviewEvidence({
  view,
  metric,
}: {
  view: ReviewView;
  metric: ReviewMetric;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<ReviewEvidencePage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const presence = usePresence(open);
  useEffect(() => () => requestRef.current?.abort(), []);

  function close() {
    requestRef.current?.abort();
    setPending(false);
    setOpen(false);
  }

  useModalLayer({
    open,
    containerRef,
    returnFocusRef: triggerRef,
    onClose: close,
  });

  async function load(cursor?: string) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError(null);
    const query = new URLSearchParams({
      timeframe: view.facts.period.timeframe,
      startOn: view.facts.period.startOn,
      metricKey: metric.key,
      fingerprint: view.facts.fingerprint,
      ...(view.edition ? { editionId: view.edition.id } : {}),
      ...(cursor ? { cursor } : {}),
    });
    try {
      const response = await fetch(`/api/reviews/sources?${query}`, {
        cache: "no-store",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15_000),
        ]),
      });
      const body = (await response.json().catch(() => null)) as
        (ReviewEvidencePage & { error?: string }) | null;
      if (controller.signal.aborted) return;
      if (
        response.status === 409 ||
        (body?.fingerprint && body.fingerprint !== view.facts.fingerprint)
      ) {
        setChanged(true);
        setError(
          "The live evidence changed. Refresh the reading before loading more sources.",
        );
        return;
      }
      if (!response.ok || !body || !Array.isArray(body.items))
        throw new Error(
          body?.error ||
            "The source records could not be loaded. Your review remains available.",
        );
      setPage((current) =>
        cursor && current
          ? {
              ...body,
              items: [
                ...current.items,
                ...body.items.filter(
                  (item) => !current.items.some(({ key }) => key === item.key),
                ),
              ],
            }
          : body,
      );
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "The source records could not be loaded.",
        );
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        onClick={() => {
          setOpen(true);
          setChanged(false);
          setPage(null);
          void load();
        }}
        aria-label={`Inspect sources for ${metric.label}`}
      >
        <FileSearch aria-hidden="true" /> Inspect sources
      </button>
      {presence.isPresent &&
        createPortal(
          <div
            className={styles.layer}
            data-state={presence.presenceState}
            aria-hidden={!open}
            inert={presence.isExiting}
            onAnimationEnd={presence.onPresenceAnimationEnd}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              ref={containerRef}
              role="dialog"
              aria-modal={open ? true : undefined}
              tabIndex={-1}
              aria-labelledby={titleId}
              data-modal-layer={open ? "open" : "closed"}
              className={styles.panel}
              inert={!open}
            >
              <header className={styles.heading}>
                <div>
                  <p className="eyebrow">Behind the reading</p>
                  <h2 id={titleId}>{metric.label}</h2>
                  <p>
                    {view.facts.period.label} ·{" "}
                    {view.edition
                      ? `Edition ${view.edition.number}`
                      : "Live evidence"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Close sources for ${metric.label}`}
                  onClick={close}
                >
                  <X aria-hidden="true" />
                </Button>
              </header>
              <div className={styles.definition}>
                <strong className="timer-numerals">{metric.valueLabel}</strong>
                <p>{metric.qualification}</p>
                <span>
                  {view.facts.period.startOn} — {view.facts.period.endOn} ·
                  Europe/Amsterdam
                </span>
              </div>
              <div className={styles.sources} aria-busy={pending}>
                {page && (
                  <p className={styles.count}>
                    {page.total} qualifying source{" "}
                    {page.total === 1 ? "record" : "records"}.{" "}
                    {view.edition
                      ? "This reading preserves what was captured in the edition."
                      : "This is the current qualified reading."}
                  </p>
                )}
                {page?.items.map((source) => (
                  <article key={source.key} className={styles.source}>
                    <div className={styles.sourceMeta}>
                      <span>
                        {source.meaning === "USER_JUDGMENT"
                          ? "Your recorded judgment"
                          : source.kind.replaceAll("_", " ").toLowerCase()}
                      </span>
                      {source.dimension && <span>{source.dimension}</span>}
                      <time dateTime={source.occurredAt}>
                        {formatReviewDate(source.occurredAt)}
                      </time>
                    </div>
                    {source.href ? (
                      <Link href={source.href} className={styles.sourceTitle}>
                        {source.label}
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    ) : (
                      <h3>{source.label}</h3>
                    )}
                    {source.excerpt && (
                      <p className={styles.excerpt}>{source.excerpt}</p>
                    )}
                    {source.truncated && (
                      <p className={styles.qualification}>
                        Excerpt shortened. Open the source to read the complete
                        record.
                      </p>
                    )}
                    <div className={styles.sourceFoot}>
                      <span>
                        {source.unit === "minor" && source.currency
                          ? formatMoney(source.value, source.currency)
                          : source.unit === "seconds"
                            ? formatDuration(Number(source.value), true)
                            : `${source.value}${source.unit ? ` ${source.unit}` : ""}`}
                      </span>
                      <p>{source.qualification}</p>
                    </div>
                  </article>
                ))}
                {page?.items.length === 0 && (
                  <p className={styles.empty}>
                    No qualifying source records in this reading.
                  </p>
                )}
                {page?.warnings.map((warning) => (
                  <p className={styles.warning} key={warning}>
                    {warning}
                  </p>
                ))}
                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                {pending && (
                  <p className={styles.count} role="status">
                    Loading source records…
                  </p>
                )}
                <div className={styles.actions}>
                  {changed ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        close();
                        window.location.assign(view.reviewHref);
                      }}
                    >
                      Reload live reading
                    </Button>
                  ) : error ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void load(page?.nextCursor ?? undefined)}
                    >
                      Try again
                    </Button>
                  ) : page?.nextCursor ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => void load(page.nextCursor!)}
                    >
                      More source records
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
