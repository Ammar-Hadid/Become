"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Workspace,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import {
  InterfaceSoundProvider,
  InterfaceSoundContext,
} from "@/components/ui/sound/components/interface-sound-provider.component";
import { Card } from "@/components/ui/cards/card.component";
import { Button } from "@/components/ui/buttons/button.component";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import { ReviewArtwork } from "@/features/reviews/reading/components/review-artwork.component";
import { ReviewSeasonDirection } from "@/features/reviews/reading/components/review-season-direction.component";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";
import { useSeasonTransition } from "../hooks/use-season-transition.hook";
import { suppressAutomaticTransition } from "../utils/transition-storage.util";
import { SeasonFinaleDays } from "./season-finale-days.component";
import { SeasonFinaleChanges } from "./season-finale-changes.component";
import styles from "../styles/season-finale.module.css";

const passages = [
  { label: "What you brought", title: "A direction, chosen." },
  { label: "What filled the days", title: "The days became a life." },
  { label: "What changed", title: "What took shape." },
  {
    label: "What you take with you",
    title: "What stays with you?",
  },
] as const;

export function SeasonFinale({ view }: { view: SeasonTransitionView }) {
  return (
    <InterfaceSoundProvider>
      <Workspace area="direction">
        <SeasonFinaleSession
          key={`${view.storageScope}:${view.replay ? "replay" : "ritual"}`}
          view={view}
        />
      </Workspace>
    </InterfaceSoundProvider>
  );
}

function SeasonFinaleSession({
  view: initialView,
}: {
  view: SeasonTransitionView;
}) {
  const router = useRouter();
  const sound = useContext(InterfaceSoundContext);
  const { view, pending, error, ready, command } =
    useSeasonTransition(initialView);
  const [replayMovement, setReplayMovement] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [leaving, setLeaving] = useState(false);
  const navigationPending = useRef(false);
  const headingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const controlsRef = useRef<HTMLElement | null>(null);
  const previousMovement = useRef(
    view.replay ? 0 : view.editionId && view.movement > 0 ? -1 : view.movement,
  );
  const review = view.review;
  const hasReview = Boolean(review);
  const movement = view.replay ? replayMovement : view.movement;
  const hasControl = view.replay || view.leaseOwned;
  const canBegin =
    ready &&
    !view.replay &&
    !view.editionId &&
    !view.occupied &&
    (view.disposition === "AVAILABLE" || view.disposition === "DEFERRED");
  const canNavigate =
    !pending && !leaving && (view.replay || hasControl || canBegin);

  useEffect(() => {
    const controls = controlsRef.current;
    const main = controls?.closest("main");
    if (!controls || !main) return;
    const measure = () =>
      main.style.setProperty(
        "--finale-controls-height",
        `${controls.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    return () => observer.disconnect();
  }, [hasReview]);

  useEffect(() => {
    if (previousMovement.current === movement) return;
    previousMovement.current = movement;
    const frame = requestAnimationFrame(() => {
      const heading = headingRefs.current[movement];
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [movement]);

  function leave(type: "DEFER" | "SKIP") {
    if (leaving) return;
    setLeaving(true);
    const notice =
      type === "DEFER"
        ? "Your finale is paused. Return when you choose; it will not open automatically."
        : "You left the finale. Your review remains available, and you can continue the Season opening from Home.";
    suppressAutomaticTransition(initialView, notice);
    suppressAutomaticTransition(view, notice);
    // Navigation never waits for persistence. Resolve an earlier command before
    // sending the exit, so an in-flight BEGIN cannot restore automatic entry.
    void command(type).then((result) => {
      if (!result || result.error) {
        const message =
          "You are back in Become. This tab will leave the finale paused, but the saved deferral could not be confirmed. You can retry from its manual entry.";
        suppressAutomaticTransition(initialView, message);
        suppressAutomaticTransition(result?.transition ?? view, message);
      }
    });
    router.replace("/?transition=paused", { scroll: false });
  }

  async function selectMovement(index: number) {
    if (index === movement || !canNavigate || navigationPending.current) return;
    setDirection(index > movement ? "forward" : "back");
    if (view.replay) {
      setReplayMovement(index);
      sound?.play("controlConfirmed");
      return;
    }
    navigationPending.current = true;
    try {
      if (canBegin) {
        const result = await command("BEGIN");
        if (!result?.transition || result.error) return;
      } else if (!hasControl) return;
      const result = await command("ADVANCE", index);
      if (result?.transition && !result.error) sound?.play("controlConfirmed");
    } finally {
      navigationPending.current = false;
    }
  }

  async function next() {
    if (!canNavigate || navigationPending.current) return;
    if (movement < 3) {
      await selectMovement(movement + 1);
      return;
    }
    if (view.replay) return;
    const result = await command("COMPLETE");
    if (result?.transition && !result.error) {
      sound?.play("seasonMilestone");
      router.replace(result.transition.destinationHref);
    }
  }

  if (!review)
    return (
      <main className={styles.finale}>
        <header className={styles.topBar}>
          <Link href="/">
            <ArrowLeft aria-hidden="true" /> Home
          </Link>
        </header>
        <div className={styles.unavailable}>
          <p className="eyebrow">Season finale</p>
          <h1>A chapter you can return to.</h1>
          <p>
            The review could not be loaded for this finale. Become remains
            available.
          </p>
          <Link href={view.destinationHref}>
            {view.destinationLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </main>
    );

  const facts = review.facts;
  const identity = facts.identity;
  const poster =
    identity.media.find(({ poster }) => poster) ?? identity.media[0];
  const quote = identity.quotes.find(({ featured }) => featured);
  const keptMoments = facts.moments.filter((moment) =>
    review.writing.selectedMomentKeys.includes(moment.key),
  );
  const moments = (keptMoments.length ? keptMoments : facts.moments).slice(
    0,
    3,
  );
  const metrics = facts.metrics.filter(
    (metric) =>
      metric.domain !== "sessions" &&
      metric.availability !== "NOT_RECORDED" &&
      (metric.availability === "AVAILABLE" || metric.sourceCount > 0),
  );
  const visible = (index: number) => index === movement;
  const writing = review.writing;

  return (
    <main
      className={styles.finale}
      data-replay={view.replay || undefined}
      data-direction={direction}
      data-testid="season-finale"
    >
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.topBar}>
        <Link href={view.replay ? review.reviewHref : "/"}>
          <ArrowLeft aria-hidden="true" />
          {view.replay ? "Review" : "Home"}
        </Link>
        <p>
          {facts.period.label}{" "}
          <span>
            ·{" "}
            {view.replay
              ? review.edition
                ? "Preserved finale"
                : "Season reading"
              : "Season finale"}
          </span>
        </p>
        {view.replay && <Link href={view.destinationHref}>Leave replay</Link>}
      </header>

      <div className={styles.movementTools}>
        <nav
          aria-label="Finale passages"
          data-testid="finale-movement-navigation"
        >
          <span
            className={styles.movementGuide}
            data-testid="finale-movement-guide"
            aria-hidden="true"
            style={{ "--movement-index": movement } as CSSProperties}
          />
          {passages.map((passage, index) => (
            <button
              key={passage.label}
              type="button"
              aria-label={`${index + 1}. ${passage.label}`}
              aria-controls={`finale-passage-${index}`}
              aria-current={index === movement ? "step" : undefined}
              disabled={!canNavigate}
              onClick={() => void selectMovement(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{passage.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {!view.editionId && !view.replay && (
        <aside className={styles.previewNote}>
          <details>
            <summary>
              {review.edition
                ? `Saved edition ${review.edition.number} · preview`
                : "Live review · preview"}
            </summary>
            <p>
              {review.edition
                ? `Continue gathers this finale from saved edition ${review.edition.number}.`
                : "Continue preserves your saved review as this finale's reading."}
            </p>
          </details>
          <Link href={review.reviewHref}>
            Read the full review first <ArrowRight aria-hidden="true" />
          </Link>
        </aside>
      )}

      <article className={styles.document}>
        <Card
          className={`${styles.passage} ${styles.beginning}`}
          hidden={!visible(0)}
          aria-labelledby="finale-passage-0"
          data-current={movement === 0 || undefined}
        >
          <div className={styles.openingCopy}>
            <p className="eyebrow">01 · {passages[0].label}</p>
            <h1
              id="finale-passage-0"
              tabIndex={-1}
              ref={(node) => {
                headingRefs.current[0] = node;
              }}
            >
              {identity.title || passages[0].title}
            </h1>
            <p className={styles.period}>
              {facts.period.startOn} — {facts.period.endOn}
            </p>
            <ReviewSeasonDirection identity={identity} compact />
            {identity.characterName && (
              <p className={styles.inspiration}>
                The inspiration you chose{" "}
                <strong>{identity.characterName}</strong>
              </p>
            )}
            {quote && (
              <details className={styles.recordedQuote}>
                <summary>A line you chose for this Season</summary>
                <SeasonQuoteExcerpt quote={quote} />
              </details>
            )}
          </div>
          {(poster || identity.characterName) && (
            <figure
              className={styles.poster}
              data-testid="finale-season-poster"
            >
              <ReviewArtwork
                src={poster?.href ?? null}
                alt={
                  poster?.decorative
                    ? ""
                    : poster?.alt || identity.characterName
                }
                fit="cover"
                position={
                  poster
                    ? `${poster.focalX * 100}% ${poster.focalY * 100}%`
                    : undefined
                }
                priority
              />
              <figcaption>
                {poster?.provenance.credit || identity.characterName}
              </figcaption>
            </figure>
          )}
        </Card>

        <Card
          className={`${styles.passage} ${styles.days}`}
          hidden={!visible(1)}
          aria-labelledby="finale-passage-1"
          data-current={movement === 1 || undefined}
        >
          <SeasonFinaleDays
            review={review}
            moments={moments}
            title={passages[1].title}
            active={visible(1)}
            headingRef={(node) => {
              headingRefs.current[1] = node;
            }}
          />
        </Card>

        <Card
          className={`${styles.passage} ${styles.changed}`}
          hidden={!visible(2)}
          aria-labelledby="finale-passage-2"
          data-current={movement === 2 || undefined}
        >
          <SeasonFinaleChanges
            review={review}
            metrics={metrics}
            title={passages[2].title}
            headingRef={(node) => {
              headingRefs.current[2] = node;
            }}
          />
        </Card>

        <Card
          className={`${styles.passage} ${styles.closing}`}
          hidden={!visible(3)}
          aria-labelledby="finale-passage-3"
          data-current={movement === 3 || undefined}
        >
          <p className="eyebrow">04 · {passages[3].label}</p>
          <h2
            id="finale-passage-3"
            tabIndex={-1}
            ref={(node) => {
              headingRefs.current[3] = node;
            }}
          >
            {passages[3].title}
          </h2>
          {writing.reflection ? (
            <div className={styles.savedWords}>
              <blockquote className={styles.lastWords}>
                {writing.reflection}
              </blockquote>
              <details className={styles.momentDetail}>
                <summary>Your saved reflection · read in full</summary>
                <p>{writing.reflection}</p>
              </details>
            </div>
          ) : (
            <p className={styles.description}>
              There is room for your own reading.
            </p>
          )}
          {(writing.carryForward || writing.leaveBehind) && (
            <dl className={styles.carry}>
              {writing.carryForward && (
                <div>
                  <dt>To carry</dt>
                  <dd>
                    <p>{writing.carryForward}</p>
                    <details className={styles.momentDetail}>
                      <summary>Read in full</summary>
                      <p>{writing.carryForward}</p>
                    </details>
                  </dd>
                </div>
              )}
              {writing.leaveBehind && (
                <div>
                  <dt>To leave</dt>
                  <dd>
                    <p>{writing.leaveBehind}</p>
                    <details className={styles.momentDetail}>
                      <summary>Read in full</summary>
                      <p>{writing.leaveBehind}</p>
                    </details>
                  </dd>
                </div>
              )}
            </dl>
          )}
          <details className={styles.closingLine}>
            <summary>About this ending</summary>
            <span aria-hidden="true" />
            <p>
              {identity.characterName
                ? `${identity.characterName} was the inspiration you chose for this season. The meaning you take from it is yours.`
                : "The days belong to the season. What you take from them belongs to you."}
            </p>
          </details>
          <Link className={styles.reviewLink} href={review.reviewHref}>
            {review.canFinalize
              ? "Review your words & finalize the reading"
              : "Return to the full review"}
            <ArrowRight aria-hidden="true" />
          </Link>
          <details className={styles.editionNote}>
            <summary>
              {review.edition
                ? `Preserved edition ${review.edition.number}`
                : "About this reading"}
            </summary>
            <p>
              {review.edition
                ? view.editionId
                  ? `This finale preserves edition ${review.edition.number}.`
                  : `Continuing will gather this finale from saved edition ${review.edition.number}.`
                : view.replay
                  ? "No presentation was captured before this finale was skipped. This reading uses the live record."
                  : "Continuing will gather this finale from your saved review."}{" "}
              Closing the finale does not conclude goals or experiments, or
              finalize your written review.
            </p>
          </details>
        </Card>
      </article>

      <footer className={styles.controls} ref={controlsRef}>
        <div className={styles.progress} role="status">
          <span>{String(movement + 1).padStart(2, "0")} / 04</span>
          <p>{passages[Math.min(movement, 3)].label}</p>
          {view.replay && (
            <span>
              <RotateCcw aria-hidden="true" /> Replay
            </span>
          )}
        </div>
        <div className={styles.controlActions}>
          {!view.replay && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => leave("DEFER")}
              disabled={leaving}
            >
              Not now
            </Button>
          )}
          {!view.replay && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => leave("SKIP")}
              disabled={leaving}
            >
              Skip finale
            </Button>
          )}
          {!view.replay && view.disposition === "COMPLETED" ? (
            <WorkspaceLink variant="primary" href={view.destinationHref}>
              {view.destinationLabel}
              <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          ) : view.replay && movement === 3 ? (
            <WorkspaceLink variant="primary" href={view.destinationHref}>
              Return to the review <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          ) : (
            <Button
              type="button"
              disabled={pending || leaving || (!hasControl && !canBegin)}
              onClick={() => void next()}
            >
              {pending
                ? "Saving your place…"
                : movement < 3
                  ? "Continue"
                  : view.destinationLabel}
              {movement === 3 ? (
                <Check aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
        {!view.replay &&
          view.disposition !== "COMPLETED" &&
          !hasControl &&
          !canBegin && (
            <p className={styles.controlNotice} role="status">
              {view.occupied
                ? "An active or paused session is using your attention. You can return Home and leave this finale for later."
                : !ready || pending
                  ? "Checking your saved place…"
                  : "This finale is open elsewhere, or its place could not be confirmed. You can still read and leave freely."}
            </p>
          )}
        {error && (
          <p className={styles.controlError} role="alert">
            {error}
            <button
              type="button"
              onClick={() => void command(view.leaseOwned ? "RENEW" : "BEGIN")}
              disabled={pending}
            >
              Retry saved place
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Reload this reading
            </button>
          </p>
        )}
      </footer>
    </main>
  );
}
