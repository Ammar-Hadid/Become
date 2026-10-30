"use client";

import { Card } from "@/components/ui/cards/card.component";
import { Button } from "@/components/ui/buttons/button.component";
import { WorkspaceLink } from "@/components/ui/workspace/workspace.component";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  History,
} from "lucide-react";
import { useState } from "react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { ReviewTimeRibbon } from "@/features/reviews/charts/components/review-time-ribbon.component";
import type { ReviewView } from "@/features/reviews/contracts/types/review.types";
import { ReviewEvidence } from "@/features/reviews/evidence/components/review-evidence.component";
import { ReviewReflection } from "@/features/reviews/reflection/components/review-reflection.component";
import { SeasonQuoteExcerpt } from "@/features/seasons/media/components/season-quote-excerpt.component";
import { ReviewArtwork } from "./review-artwork.component";
import { ReviewChapter } from "./review-chapter.component";
import { ReviewIntentions } from "./review-intentions.component";
import { ReviewMetrics } from "./review-metrics.component";
import { ReviewMetricGroups } from "./review-metric-groups.component";
import { ReviewMoments } from "./review-moments.component";
import { ReviewReadingLayout } from "./review-reading-layout.component";
import { formatReviewDate } from "../utils/review-date.util";
import { ReviewSeasonChapters } from "./review-season-chapters.component";
import { ReviewSeasonDirection } from "./review-season-direction.component";
import styles from "../styles/review-reading.module.css";

type ReviewNavigation = {
  previousHref: string;
  nextHref: string | null;
  currentHref: string;
  label: string;
};

export function ReviewReading({
  view,
  navigation,
}: {
  view: ReviewView;
  navigation?: ReviewNavigation;
}) {
  return (
    <ReviewReadingSession
      key={`${view.storageScope}:${view.edition?.id ?? "live"}`}
      view={view}
      navigation={navigation}
    />
  );
}

function ReviewReadingSession({
  view: initialView,
  navigation,
}: {
  view: ReviewView;
  navigation?: ReviewNavigation;
}) {
  const [view, setView] = useState(initialView);
  const [writing, setWriting] = useState(initialView.writing);
  const [editingAmendment, setEditingAmendment] = useState(false);
  const [pinNotice, setPinNotice] = useState<string | null>(null);
  const [writingPending, setWritingPending] = useState(false);
  const facts = view.facts;
  const identity = facts.identity;
  const richSeason = facts.period.timeframe === "season";
  const hasSeasonDirection =
    Boolean(identity.intention) || identity.originalIntention != null;
  const reading = {
    week: {
      title: "Your week in review.",
      introduction:
        "The shape of seven days: where your time went, what you made, and what deserves another look.",
      timeTitle: "The rhythm of the week.",
      timeLabel: "Days & attention",
      reflectionTitle: "One reading to take into the week ahead.",
    },
    month: {
      title: "Your month in review.",
      introduction:
        "Enough distance to see a pattern. Follow the recorded days, work and choices, then name what they mean to you.",
      timeTitle: "A month of recorded days.",
      timeLabel: "The month's rhythm",
      reflectionTitle: "What became clearer this month?",
    },
    season: {
      title: identity.title || "A season, gathered.",
      introduction:
        (identity.originalIntention ?? identity.intention) ||
        "The intentions, recorded days, work and choices that belong to this season.",
      timeTitle: "Where the time went.",
      timeLabel: "The days",
      reflectionTitle: "Keep one honest reading.",
    },
    year: {
      title: "Your year in review.",
      introduction:
        "Read across the months. Look at the direction you chose, the work that reached the world, and the conclusions you recorded.",
      timeTitle: "The year in recorded time.",
      timeLabel: "Across the months",
      reflectionTitle: "What does the year leave you with?",
    },
  }[facts.period.timeframe];
  const poster =
    identity.media.find(({ poster }) => poster) ?? identity.media[0];
  const quote = identity.quotes.find(({ featured }) => featured);
  const focusMetric = facts.metrics.find(
    (metric) => metric.domain === "sessions",
  );
  const outcomeMetrics = facts.metrics.filter(
    (metric) =>
      metric.domain !== "sessions" &&
      metric.availability !== "NOT_RECORDED" &&
      (metric.availability === "AVAILABLE" || metric.sourceCount > 0),
  );
  const otherRecordedCounts = facts.metrics.filter(
    (metric) =>
      metric.domain !== "sessions" &&
      metric.availability === "RECORDED_ZERO" &&
      metric.sourceCount === 0,
  );
  const editable =
    editingAmendment ||
    (!view.edition &&
      !view.editions.some(
        (edition) =>
          edition.kind === "FINALIZED" || edition.kind === "AMENDMENT",
      ));
  const moments = facts.moments;
  const chapters = [
    ...(facts.intentions.length ||
    hasSeasonDirection ||
    facts.seasonChapters?.length
      ? [{ id: "review-intentions", label: "At the beginning" }]
      : []),
    ...(focusMetric || facts.time.buckets.length
      ? [{ id: "review-time", label: reading.timeLabel }]
      : []),
    ...(outcomeMetrics.length
      ? [{ id: "review-outcomes", label: "What took shape" }]
      : []),
    ...(moments.length
      ? [{ id: "review-moments", label: "Defining moments" }]
      : []),
    { id: "review-reflection", label: "Your reflection" },
  ];
  const chapterNumber = (id: string) =>
    String(chapters.findIndex((chapter) => chapter.id === id) + 1).padStart(
      2,
      "0",
    );

  function acceptView(next: ReviewView) {
    setView((current) => (next.version >= current.version ? next : current));
  }

  const masthead = (
    <>
      <div className={styles.backRow}>
        <Link href="/reviews">
          <ArrowLeft aria-hidden="true" /> Reviews
        </Link>
        <span>
          {facts.period.state === "OPEN"
            ? "Period in progress"
            : facts.period.state === "UPCOMING"
              ? "Upcoming period"
              : "Completed period"}
        </span>
      </div>
      {navigation && (
        <nav className={styles.periodNavigation} aria-label={navigation.label}>
          <Link href={navigation.previousHref}>
            <ArrowLeft aria-hidden="true" />
            Previous {facts.period.timeframe}
          </Link>
          {navigation.currentHref !== view.reviewHref &&
            navigation.currentHref !== navigation.nextHref && (
              <Link href={navigation.currentHref}>
                Current {facts.period.timeframe}
              </Link>
            )}
          {navigation.nextHref && (
            <Link href={navigation.nextHref}>
              Next {facts.period.timeframe}
              {navigation.nextHref === navigation.currentHref && " (current)"}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
      <Card as="div" material="elevated-glass" className={styles.masthead}>
        <div className={styles.mastheadCopy}>
          <p className="eyebrow">
            {facts.period.label} ·{" "}
            {richSeason ? "Season review" : `${facts.period.timeframe} review`}
          </p>
          <h1>{reading.title}</h1>
          <p className={styles.introduction}>{reading.introduction}</p>
          <div className={styles.periodMeta}>
            <span>
              {facts.period.startOn} — {facts.period.endOn}
            </span>
            <span>Europe/Amsterdam</span>
            {view.edition && (
              <span>
                Edition {view.edition.number} ·{" "}
                {view.edition.kind === "PRESENTATION"
                  ? "Preserved presentation"
                  : "Finalized reading"}
              </span>
            )}
          </div>
          <div className={styles.mastheadActions}>
            {view.finaleHref && (
              <WorkspaceLink href={view.finaleHref} variant="primary">
                <BookOpen aria-hidden="true" />
                {view.edition ? "Revisit the finale" : "Close the chapter"}
                <ArrowRight aria-hidden="true" />
              </WorkspaceLink>
            )}
            {view.editions.length > 0 && (
              <SubMenu
                label="Read a saved edition"
                placement="bottom-end"
                trigger={(props) => (
                  <Button {...props} variant="secondary">
                    <History aria-hidden="true" /> Editions{" "}
                    <ChevronDown aria-hidden="true" />
                  </Button>
                )}
              >
                {view.editions.map((edition) => (
                  <MenuItem
                    key={edition.id}
                    href={`${view.reviewHref}?editionId=${encodeURIComponent(edition.id)}`}
                  >
                    Edition {edition.number} ·{" "}
                    {edition.kind === "PRESENTATION"
                      ? "Presentation"
                      : edition.kind === "AMENDMENT"
                        ? "Amendment"
                        : "Finalized"}
                  </MenuItem>
                ))}
              </SubMenu>
            )}
          </div>
        </div>
        {richSeason && (poster || identity.characterName) && (
          <figure className={styles.identityArtwork}>
            <ReviewArtwork
              src={poster?.href ?? null}
              alt={
                poster?.decorative ? "" : poster?.alt || identity.characterName
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
              <span>{identity.characterName || "Your season"}</span>
              {poster?.provenance.credit && (
                <small>{poster.provenance.credit}</small>
              )}
            </figcaption>
          </figure>
        )}
      </Card>
      {view.liveChanged && (
        <aside className={styles.changedNotice}>
          <span>
            {view.edition
              ? "This edition keeps its original reading. Some source evidence has changed since it was captured."
              : "The live evidence differs from the latest finalized reading. Earlier editions remain preserved."}
          </span>
          {view.edition && (
            <Link href={view.reviewHref}>
              Inspect the live evidence <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </aside>
      )}
      {view.edition && !view.liveComparisonAvailable && (
        <aside className={styles.changedNotice}>
          Live comparison unavailable; this saved edition remains intact.
        </aside>
      )}
      {facts.warnings.length > 0 && (
        <details className={styles.coverageNotice}>
          <summary>
            Coverage & qualifications · {facts.warnings.length}{" "}
            {facts.warnings.length === 1 ? "note" : "notes"}
          </summary>
          <ul>
            {facts.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );

  return (
    <ReviewReadingLayout
      timeframe={facts.period.timeframe}
      masthead={masthead}
      navigation={
        <nav aria-label="Review contents">
          {chapters.map((chapter, index) => (
            <a
              href={`#${chapter.id}`}
              key={chapter.id}
              onClick={(event) => {
                event.preventDefault();
                const heading = document.getElementById(`${chapter.id}-title`);
                heading?.focus({ preventScroll: true });
                heading?.scrollIntoView({
                  block: "start",
                  behavior: "instant",
                });
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{chapter.label}</span>
            </a>
          ))}
        </nav>
      }
    >
      {(facts.intentions.length > 0 ||
        hasSeasonDirection ||
        Boolean(facts.seasonChapters?.length)) && (
        <ReviewChapter
          id="review-intentions"
          number={chapterNumber("review-intentions")}
          eyebrow="What mattered at the start"
          title="The direction you brought."
          aside={quote ? <SeasonQuoteExcerpt quote={quote} /> : undefined}
        >
          {hasSeasonDirection && <ReviewSeasonDirection identity={identity} />}
          {facts.seasonChapters && facts.seasonChapters.length > 0 && (
            <ReviewSeasonChapters chapters={facts.seasonChapters} />
          )}
          {facts.intentions.length > 0 && (
            <ReviewIntentions intentions={facts.intentions} />
          )}
          {facts.omitted.intentions > 0 && (
            <p className={styles.annotation}>
              {facts.omitted.intentions} additional intentions remain available
              in Direction. This review shows a bounded selection.
            </p>
          )}
        </ReviewChapter>
      )}
      {(focusMetric || facts.time.buckets.length > 0) && (
        <ReviewChapter
          id="review-time"
          number={chapterNumber("review-time")}
          eyebrow="The recorded days"
          title={reading.timeTitle}
          description={
            facts.period.comparison.available
              ? `Comparison: ${facts.period.comparison.label} · ${facts.period.comparison.mode === "EQUAL_ELAPSED" ? "equal elapsed windows" : "complete calendar periods"}.`
              : "A comparable previous reporting window is not available."
          }
        >
          <ReviewTimeRibbon time={facts.time} label={facts.period.label} />
          {focusMetric && <ReviewEvidence view={view} metric={focusMetric} />}
        </ReviewChapter>
      )}
      {outcomeMetrics.length > 0 && (
        <ReviewChapter
          id="review-outcomes"
          number={chapterNumber("review-outcomes")}
          eyebrow="Outputs, outcomes & qualified results"
          title="What took shape."
          description="Different kinds of evidence stay distinct. Making, releasing, receiving and explicitly concluding each mean something different."
        >
          <ReviewMetricGroups view={view} metrics={outcomeMetrics} allowAll />
        </ReviewChapter>
      )}
      {moments.length > 0 && (
        <ReviewChapter
          id="review-moments"
          number={chapterNumber("review-moments")}
          eyebrow="A few things worth returning to"
          title="The moments that belong."
          description={
            editable
              ? "Inspect why each moment appears. Keep the ones that define this period for you."
              : "The source wording and moments preserved with this reading."
          }
        >
          <ReviewMoments
            moments={moments}
            selectedKeys={
              view.edition && !editingAmendment
                ? view.writing.selectedMomentKeys
                : writing.selectedMomentKeys
            }
            editable={editable}
            disabled={writingPending}
            onToggle={(key) => {
              if (
                !writing.selectedMomentKeys.includes(key) &&
                writing.selectedMomentKeys.length >= 12
              ) {
                setPinNotice(
                  "You can keep twelve defining moments. Remove one before keeping another.",
                );
                return;
              }
              setPinNotice(null);
              setWriting((current) => ({
                ...current,
                selectedMomentKeys: current.selectedMomentKeys.includes(key)
                  ? current.selectedMomentKeys.filter(
                      (selected) => selected !== key,
                    )
                  : [...current.selectedMomentKeys, key],
              }));
            }}
          />
          {pinNotice && (
            <p className={styles.annotation} role="status">
              {pinNotice}
            </p>
          )}
          {facts.omitted.moments > 0 && (
            <p className={styles.annotation}>
              {facts.omitted.moments} additional moments are outside this
              bounded selection. Metric totals include the complete eligible
              dataset.
            </p>
          )}
        </ReviewChapter>
      )}
      <ReviewChapter
        id="review-reflection"
        number={chapterNumber("review-reflection")}
        eyebrow="What it means to you"
        title={reading.reflectionTitle}
        description="Facts describe the record. Your words hold what the period meant."
      >
        <ReviewReflection
          view={view}
          writing={writing}
          onWriting={setWriting}
          onView={acceptView}
          onEditingChange={setEditingAmendment}
          onPendingChange={setWritingPending}
        />
        {otherRecordedCounts.length > 0 && (
          <details className={styles.recordCoverage}>
            <summary>Other recorded counts</summary>
            <p className={styles.annotation}>
              These qualified counts are zero. That does not establish the
              absence of unrecorded work or outcomes.
            </p>
            <ReviewMetrics view={view} metrics={otherRecordedCounts} compact />
          </details>
        )}
        <details className={styles.recordCoverage}>
          <summary>The limits of this record</summary>
          <dl>
            {facts.coverage.map((coverage) => (
              <div key={coverage.domain}>
                <dt>
                  {coverage.domain[0].toUpperCase() + coverage.domain.slice(1)}
                </dt>
                <dd>{coverage.detail}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.annotation}>
            Evaluated {formatReviewDate(facts.referenceTime, true)}. Recorded
            facts and your own judgments keep their distinct meanings.
          </p>
        </details>
      </ReviewChapter>
    </ReviewReadingLayout>
  );
}
