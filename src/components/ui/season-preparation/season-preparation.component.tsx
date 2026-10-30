"use client";
import Image from "next/image";
import { useEffect, useId, useState, type ReactNode, type Ref } from "react";
import { ArrowLeft, ArrowRight, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { LoadingIndicator } from "@/components/ui/loading/loading-indicator.component";
import { AiGeneratedText } from "@/components/ui/ai-generated-text/ai-generated-text.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { Tooltip } from "@/components/ui/tooltips/tooltip.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import "./season-preparation.css";

/** Display data supplied by the feature; never used to authorize approval. */
export type PreparationProgress = {
  attempt: string;
  startedAt: string;
  phase: "research" | "writing" | "checking";
  paragraphs: string[];
  estimate: { minMs: number; maxMs: number; samples: number } | null;
};

export function PreparationDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const presence = usePresence(open, "surface");
  const titleId = useId();
  if (!presence.isPresent) return null;
  return (
    <Drawer
      open={open}
      presenceState={presence.presenceState}
      exiting={presence.isExiting}
      onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
      onClose={onClose}
      titleId={titleId}
      header={
        <>
          <h2 id={titleId} className="type-section-title">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </>
      }
    >
      {children}
    </Drawer>
  );
}

/** Focus composition approved 26 October 2026. Data and actions stay feature-owned. */
export function SeasonPreparationProgress({
  name,
  sourceWork,
  portraitHref,
  status,
  progress,
  error,
  busy,
  paused,
  onPause,
  onResume,
  onLeave,
  titleRef,
}: {
  name: string;
  sourceWork?: string;
  portraitHref?: string | null;
  status: string;
  progress?: PreparationProgress | null;
  error?: string | null;
  busy?: boolean;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onLeave?: () => void;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [readOpen, setReadOpen] = useState(false);
  const [selected, setSelected] = useState<{
    attempt: string;
    index: number;
  } | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const copyId = useId();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const stopped = status === "FAILED" || status === "PAUSED";
  const elapsed =
    progress && now
      ? Math.max(0, Math.floor((now - Date.parse(progress.startedAt)) / 1000))
      : 0;
  const range = progress?.estimate;
  const slow = Boolean(range && elapsed * 1000 > range.maxMs);
  const phase = progress?.phase ?? "research";
  const paragraphs = progress?.paragraphs ?? [];
  const index =
    selected && progress && selected.attempt === progress.attempt
      ? Math.min(selected.index, paragraphs.length - 1)
      : paragraphs.length - 1;
  const message =
    status === "FAILED"
      ? "Connection interrupted. Draft saved."
      : status === "PAUSED"
        ? "Paused. Draft saved."
        : error
          ? "Reconnecting…"
          : slow
            ? "Taking a little longer…"
            : phase === "research"
              ? "Getting to know your character…"
              : phase === "checking"
                ? "Finishing the details…"
                : "Writing your Season…";
  const timing = range
    ? `About ${Math.max(1, Math.floor(range.minMs / 60000))}–${Math.max(2, Math.ceil(range.maxMs / 60000))} min total`
    : "A few minutes";
  const showImage = portraitHref && failedImage !== portraitHref;
  const selectParagraph = (next: number) =>
    setSelected({ attempt: progress!.attempt, index: next });
  return (
    <section
      className="preparation-stage"
      data-composition="focus"
      aria-label="Season preparation"
    >
      <div className="preparation-stage-body">
        <div className="preparation-identity">
          {showImage && (
            <div className="preparation-portrait">
              <Image
                src={portraitHref}
                alt={name}
                width={480}
                height={480}
                unoptimized
                priority
                onError={() => setFailedImage(portraitHref)}
              />
            </div>
          )}
          <div className="preparation-identity-copy">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="type-season-entry-title"
            >
              {name || "Your Season"}
            </h1>
            {sourceWork && <p className="type-body-sm">{sourceWork}</p>}
          </div>
        </div>
        <div className="preparation-reading">
          {paragraphs.length ? (
            <>
              <div className="preparation-reading-label type-caption">
                <span>Season draft</span>
                <span>
                  {index + 1} / {paragraphs.length}
                </span>
              </div>
              <div className="preparation-prose" id={copyId}>
                <AiGeneratedText text={paragraphs[index]} paused={paused} />
              </div>
              <nav
                className="preparation-paragraph-nav"
                aria-label="Draft paragraphs"
              >
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous paragraph"
                    disabled={index <= 0}
                    onClick={() => selectParagraph(index - 1)}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next paragraph"
                    disabled={index >= paragraphs.length - 1}
                    onClick={() => selectParagraph(index + 1)}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReadOpen(true)}
                >
                  Read draft <ArrowRight aria-hidden="true" />
                </Button>
              </nav>
            </>
          ) : (
            <div className="preparation-empty">
              <h2 className="type-page-title">
                A Season
                <br />
                taking shape.
              </h2>
              <p className="type-body-sm">Your summary will appear here.</p>
            </div>
          )}
        </div>
      </div>
      <footer className="preparation-status-bar">
        <div className="preparation-status-copy">
          {!stopped && (
            <LoadingIndicator
              variant="orbit-arc"
              area="direction"
              label={message}
            />
          )}
          <div>
            <p className="type-body-sm" role="status">
              {message}
            </p>
            <Tooltip
              content={`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} elapsed. ${range ? "Estimate from your recent successful preparations, not a countdown." : "Not enough past runs for a reliable estimate yet."}`}
            >
              <button
                type="button"
                className="preparation-time type-caption"
                aria-label="Preparation timing details"
              >
                {stopped ? "Continue whenever you’re ready" : timing}
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="preparation-status-actions">
          {status === "FAILED" && error && (
            <details className="preparation-error-detail type-caption">
              <summary>Details</summary>
              <p>{error}</p>
            </details>
          )}
          <Button
            variant={stopped ? "primary" : "ghost"}
            size={stopped ? "sm" : "icon"}
            disabled={busy}
            aria-label={
              status === "FAILED"
                ? "Try again"
                : status === "PAUSED"
                  ? "Resume preparation"
                  : "Pause preparation"
            }
            onClick={stopped ? onResume : onPause}
          >
            {stopped ? (
              status === "FAILED" ? (
                "Try again"
              ) : (
                "Resume"
              )
            ) : (
              <Pause aria-hidden="true" />
            )}
          </Button>
          {onLeave && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLeave}
              disabled={busy}
            >
              Save & leave <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>
      <PreparationDrawer
        open={readOpen}
        onClose={() => setReadOpen(false)}
        title="Season draft"
      >
        <p className="type-caption preparation-drawer-note">
          Still being prepared. Review becomes available when complete.
        </p>
        <AiGeneratedText text={paragraphs.join("\n\n")} staticText />
      </PreparationDrawer>
    </section>
  );
}
