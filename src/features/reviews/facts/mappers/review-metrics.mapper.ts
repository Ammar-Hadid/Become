import { formatDuration } from "@/lib/dates/utils/period.util";
import { formatMoney } from "@/lib/money/utils/money.util";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";
import {
  reviewDefinitions,
  type MetricAggregate,
} from "@/features/reviews/facts/queries/review-sources.query";
import type {
  ReviewMetric,
  ReviewPeriod,
  ReviewDomain,
} from "@/features/reviews/contracts/types/review.types";
export function reviewMetrics(
  current: MetricAggregate[],
  previous: MetricAggregate[],
  period: ReviewPeriod,
  domains: ReviewDomain[],
): ReviewMetric[] {
  const valueLabel = (value: string, unit: string, currency: string | null) =>
    unit === "minor"
      ? formatMoney(value, currency!)
      : unit === "seconds"
        ? formatDuration(Number(value), true)
        : Number(value).toLocaleString("en-GB");
  const metrics: ReviewMetric[] = current.map((r) => {
    const d = reviewDefinitions.find(
      (d) => r.metricKey === d.key || r.metricKey.startsWith(d.key + ":"),
    )!;
    const p = previous.find((p) => p.metricKey === r.metricKey);
    const prior = period.comparison.available ? (p?.value ?? "0") : null;
    const delta = prior === null ? null : BigInt(r.value) - BigInt(prior);
    return {
      key: r.metricKey,
      domain: d.domain,
      label: d.label,
      value: r.value,
      valueLabel: valueLabel(r.value, d.unit, r.currency),
      unit: d.unit,
      currency: r.currency,
      sourceCount: r.count,
      previousValue: prior,
      deltaLabel:
        delta === null
          ? null
          : `${delta > 0n ? "+" : delta < 0n ? "−" : ""}${valueLabel((delta < 0n ? -delta : delta).toString(), d.unit, r.currency)} versus comparison window`,
      qualification: d.qualification,
      fingerprint: reviewFingerprint({
        version: 1,
        scope: { start: period.start, end: period.end },
        metric: d,
        source: r.hash,
      }),
      availability: r.value === "0" ? "RECORDED_ZERO" : "AVAILABLE",
    };
  });
  for (const d of reviewDefinitions.filter(
    (d) => domains.includes(d.domain) && d.unit !== "minor",
  ))
    if (!metrics.some((m) => m.key === d.key))
      metrics.push({
        key: d.key,
        domain: d.domain,
        label: d.label,
        value: "0",
        valueLabel: d.unit === "seconds" ? "0m" : "0",
        unit: d.unit,
        currency: null,
        sourceCount: 0,
        previousValue: period.comparison.available
          ? (previous.find((p) => p.metricKey === d.key)?.value ?? "0")
          : null,
        deltaLabel: null,
        qualification: d.qualification,
        fingerprint: reviewFingerprint({ definition: d, records: [] }),
        availability: "RECORDED_ZERO",
      });
  metrics.sort(
    (a, b) =>
      reviewDefinitions.findIndex((d) => a.key.startsWith(d.key)) -
        reviewDefinitions.findIndex((d) => b.key.startsWith(d.key)) ||
      a.key.localeCompare(b.key),
  );
  return metrics;
}
