"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type Ref,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  matchByDataKey,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarProps,
} from "recharts";
import { Button } from "@/components/ui/buttons/button.component";
import { resolveMotionDurationMs } from "@/components/ui/motion/utils/motion-time.util";
import type {
  ReviewMoment,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import { ReviewEvidence } from "@/features/reviews/evidence/components/review-evidence.component";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { SeasonFinaleMoments } from "./season-finale-moments.component";
import styles from "../styles/season-finale-days.module.css";

type DomainTimeSeries = NonNullable<
  ReviewView["facts"]["time"]["domainBreakdown"]
>["series"][number];

const matchMonthlyTime = matchByDataKey("start");

export function SeasonFinaleDays({
  review,
  moments,
  title,
  headingRef,
  active,
}: {
  review: ReviewView;
  moments: ReviewMoment[];
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
  active: boolean;
}) {
  const { time } = review.facts;
  const [chosenDomainId, setChosenDomainId] = useState<string | null>(null);
  const selectedDomain =
    time.domainBreakdown?.series.find(
      ({ domainId }) => domainId === chosenDomainId,
    ) ?? null;
  const selectedTime = selectedDomain ?? time;
  return (
    <div className={styles.scene} data-testid="finale-days-composition">
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">02 · What filled the days</p>
          <h2
            id="finale-passage-1"
            className={styles.title}
            tabIndex={-1}
            ref={headingRef}
          >
            {title}
          </h2>
        </div>
        <div className={styles.total} data-testid="finale-days-total">
          <strong className="timer-numerals">
            {formatDuration(selectedTime.seconds, true)}
          </strong>
          <span>
            {selectedDomain && `${selectedDomain.label} · `}recorded focused
            time
          </span>
          {selectedTime.provisionalLabel && (
            <p className={styles.provisional}>
              {selectedTime.provisionalLabel} ·{" "}
              {formatDuration(selectedTime.provisionalSeconds, true)}
            </p>
          )}
        </div>
      </header>

      {active && (
        <SeasonRecordedTime
          review={review}
          selectedDomain={selectedDomain}
          onSelectDomain={setChosenDomainId}
        />
      )}

      <div className={styles.moments} data-testid="finale-days-moments">
        {moments.length > 0 ? (
          <>
            <SeasonFinaleMoments
              moments={moments}
              selectedKeys={review.writing.selectedMomentKeys}
            />
            {(review.facts.moments.length > moments.length ||
              review.facts.omitted.moments > 0) && (
              <Link
                href={`${review.reviewHref}#review-moments`}
                className={styles.fullRecord}
              >
                See the fuller record <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </>
        ) : (
          <p className={styles.empty}>
            No additional defining moments were recorded for this reading. The
            season still happened.
          </p>
        )}
      </div>
    </div>
  );
}

function SeasonRecordedTime({
  review,
  selectedDomain,
  onSelectDomain,
}: {
  review: ReviewView;
  selectedDomain: DomainTimeSeries | null;
  onSelectDomain: (domainId: string | null) => void;
}) {
  const captionId = useId();
  const { time, period } = review.facts;
  const selectedTime = selectedDomain ?? time;
  const [motion, setMotion] = useState({
    requested: false,
    revision: 0,
    durationMs: 0,
    easing: "linear" as NonNullable<BarProps["animationEasing"]>,
  });
  const chartData = useMemo(
    () =>
      selectedTime.buckets.map((bucket) => ({
        ...bucket,
        chartedHours: bucket.seconds / 3600,
      })),
    [selectedTime.buckets],
  );
  // This is a presentation scale, kept fixed across every domain selection.
  const axisCeilingHours = useMemo(
    () =>
      Math.max(
        1,
        ...time.buckets.map(({ seconds }) => Math.ceil(seconds / 3600)),
      ),
    [time.buckets],
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopMotion = () => {
      if (media.matches)
        setMotion((current) =>
          current.requested
            ? { ...current, requested: false, durationMs: 0 }
            : current,
        );
    };
    media.addEventListener("change", stopMotion);
    return () => media.removeEventListener("change", stopMotion);
  }, []);
  const finishMotion = useCallback(() => {
    setMotion((current) =>
      current.revision === motion.revision && current.requested
        ? { ...current, requested: false }
        : current,
    );
  }, [motion.revision]);

  function chooseDomain(domainId: string | null) {
    if (domainId === (selectedDomain?.domainId ?? null)) return;
    const easing = getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-move")
      .trim()
      .replace(/\s+/g, "");
    setMotion((current) => ({
      requested: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      revision: current.revision + 1,
      durationMs: resolveMotionDurationMs("content"),
      easing: /^cubic-bezier\([\d.,-]+\)$/.test(easing)
        ? (easing as NonNullable<BarProps["animationEasing"]>)
        : "linear",
    }));
    onSelectDomain(domainId);
  }
  const focusedMetric = review.facts.metrics.find(
    ({ key }) => key === "sessions.focused",
  );
  const tickStyle = {
    fill: "var(--color-text-secondary)",
    fontSize: "var(--text-body-sm)",
  };
  return (
    <figure
      className={styles.landscape}
      aria-labelledby={captionId}
      data-testid="finale-days-time-landscape"
      data-chart-domain={selectedDomain?.domainId ?? "all"}
      data-chart-animation-requested={motion.requested || undefined}
      data-chart-animation-duration={motion.requested ? motion.durationMs : 0}
    >
      <figcaption id={captionId} className={styles.chartCaption}>
        <span>
          {selectedDomain && `${selectedDomain.label} · `}Recorded focus, month
          by month
        </span>
        <span>Pauses excluded.</span>
      </figcaption>
      <div>
        <div
          role="group"
          aria-label="Filter recorded focus by domain"
          data-testid="finale-days-domain-filter"
          className={styles.domainFilters}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={!selectedDomain}
            onClick={() => chooseDomain(null)}
          >
            ALL
          </Button>
          {time.domainBreakdown?.series.map((domain) => (
            <Button
              key={domain.domainId}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={domain.domainId === selectedDomain?.domainId}
              onClick={() => chooseDomain(domain.domainId)}
            >
              {domain.label}
            </Button>
          ))}
        </div>
        {!time.domainBreakdown && review.edition && (
          <p className={styles.domainUnavailable}>
            Domain breakdown was not captured in this edition.
          </p>
        )}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {selectedDomain?.label ?? "All domains"}.{" "}
          {formatDuration(selectedTime.seconds, true)} recorded focused time.
        </p>
      </div>
      <div className={styles.plot} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 30, right: 12, left: 0, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: "var(--color-text-muted)" }}
              tickLine={false}
              interval={0}
              tick={tickStyle}
              height={36}
              dy={10}
            />
            <YAxis
              domain={[0, axisCeilingHours]}
              allowDataOverflow
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={5}
              tick={tickStyle}
              tickFormatter={(hours: number) => `${hours}h`}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--color-primary-subtle)" }}
              content={({ active, payload, label }) =>
                active && payload?.[0] ? (
                  <div className={styles.tooltip}>
                    <span>{label}</span>
                    <strong className="timer-numerals">
                      {formatDuration(Number(payload[0].payload.seconds), true)}
                    </strong>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="chartedHours"
              fill="var(--color-primary)"
              maxBarSize={88}
              radius={[2, 2, 0, 0]}
              isAnimationActive={motion.requested ? "auto" : false}
              animationBegin={0}
              animationDuration={motion.durationMs}
              animationEasing={motion.easing}
              animationMatchBy={matchMonthlyTime}
              onAnimationEnd={finishMotion}
            >
              <LabelList
                dataKey="seconds"
                position="top"
                offset={12}
                formatter={(value) => formatDuration(Number(value), true)}
                fill="var(--color-text-primary)"
                style={{ fontSize: "var(--text-body-sm)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.chartFoot}>
        <details className={styles.timeDetails}>
          <summary>Explore the recorded time</summary>
          <div className={styles.timeDetailContent}>
            <p>
              {period.label}
              {selectedDomain && ` · ${selectedDomain.label}`}. Pauses are
              excluded. Recorded time does not measure attention quality.
            </p>
            {!selectedDomain && (
              <dl className={styles.allocations}>
                {time.allocations.map((allocation) => (
                  <div key={allocation.label}>
                    <dt>{allocation.label}</dt>
                    <dd>
                      <span className="timer-numerals">
                        {formatDuration(allocation.seconds, true)}
                      </span>
                      <span
                        className={styles.allocationTrack}
                        aria-hidden="true"
                      >
                        <i style={{ width: `${allocation.share * 100}%` }} />
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <table>
              <caption className="sr-only">
                {period.label}
                {selectedDomain
                  ? ` · ${selectedDomain.label}`
                  : " · All domains"}{" "}
                recorded focused time by reporting bucket
              </caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Recorded time</th>
                </tr>
              </thead>
              <tbody>
                {selectedTime.buckets.map((bucket) => (
                  <tr key={bucket.start}>
                    <th scope="row">{bucket.label}</th>
                    <td className="timer-numerals">
                      {formatDuration(bucket.seconds, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {selectedDomain ? (
          <p className={styles.sourceScope}>
            Full source records are available under ALL.
          </p>
        ) : focusedMetric ? (
          <ReviewEvidence view={review} metric={focusedMetric} />
        ) : null}
      </div>
    </figure>
  );
}
