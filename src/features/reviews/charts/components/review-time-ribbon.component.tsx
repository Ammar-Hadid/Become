"use client";

import { useId } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PeriodReviewFacts } from "@/features/reviews/contracts/types/review.types";
import { formatDuration } from "@/lib/dates/utils/period.util";
import styles from "../../reading/styles/review-reading.module.css";

export function ReviewTimeRibbon({
  time,
  label,
  compact = false,
}: {
  time: PeriodReviewFacts["time"];
  label: string;
  compact?: boolean;
}) {
  const captionId = useId();
  const allocations = (
    <dl className={styles.allocations}>
      {time.allocations.map((allocation) => (
        <div key={allocation.label}>
          <dt>{allocation.label}</dt>
          <dd>
            <span className="timer-numerals">
              {formatDuration(allocation.seconds, true)}
            </span>
            <span className={styles.allocationTrack} aria-hidden="true">
              <i style={{ width: `${allocation.share * 100}%` }} />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
  return (
    <figure
      className={styles.timeFigure}
      aria-labelledby={captionId}
      data-compact={compact || undefined}
    >
      <div className={styles.timeHeadline}>
        <strong className="timer-numerals">
          {formatDuration(time.seconds, true)}
        </strong>
        <span>recorded focused time</span>
      </div>
      {time.provisionalLabel && (
        <p className={styles.provisional}>
          {time.provisionalLabel} ·{" "}
          {formatDuration(time.provisionalSeconds, true)}
        </p>
      )}
      <div className={styles.timeChart} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={time.buckets}
            margin={{ top: 12, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tick={{
                fill: "var(--color-text-secondary)",
                fontSize: "var(--text-body-sm)",
                lineHeight: "var(--text-body-sm--line-height)",
              }}
              dy={8}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--color-primary-subtle)" }}
              content={({ active, payload, label: bucketLabel }) =>
                active && payload?.[0] ? (
                  <div className="chart-tooltip">
                    <p>{bucketLabel}</p>
                    <strong className="timer-numerals">
                      {formatDuration(Number(payload[0].value), true)}
                    </strong>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="seconds"
              fill="var(--color-text-primary)"
              maxBarSize={24}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption id={captionId} className={styles.annotation}>
        {compact
          ? "Pauses excluded."
          : `${label}. Pauses are excluded. Recorded time does not measure attention quality.`}
      </figcaption>
      {!compact && allocations}
      <details className={styles.chartTable}>
        <summary>
          {compact ? "Explore the recorded time" : "Read the time values"}
        </summary>
        {compact && (
          <p className={styles.annotation}>
            {label}. Recorded time does not measure attention quality.
          </p>
        )}
        {compact && allocations}
        <table>
          <caption className="sr-only">
            {label} recorded focused time by reporting bucket
          </caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Recorded time</th>
            </tr>
          </thead>
          <tbody>
            {time.buckets.map((bucket) => (
              <tr key={bucket.start}>
                <th scope="row">{bucket.label}</th>
                <td className="timer-numerals">
                  {formatDuration(bucket.seconds, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
