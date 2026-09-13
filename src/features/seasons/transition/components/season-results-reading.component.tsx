"use client";

import { useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  ReviewMetric,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import { ReviewEvidence } from "@/features/reviews/evidence/components/review-evidence.component";
import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";
import { formatDuration } from "@/lib/dates/utils/period.util";
import { formatMoney } from "@/lib/money/utils/money.util";
import styles from "../styles/season-finale-changes.module.css";

function comparisonValue(metric: ReviewMetric, value: string) {
  if (metric.unit === "minor" && metric.currency)
    return formatMoney(value, metric.currency);
  if (metric.unit === "seconds") return formatDuration(Number(value), true);
  try {
    return BigInt(value).toLocaleString("en-GB");
  } catch {
    return value;
  }
}

export function SeasonResultsReading({
  review,
  metrics,
}: {
  review: ReviewView;
  metrics: ReviewMetric[];
}) {
  const domains = [...new Set(metrics.map(({ domain }) => domain))];
  const [chosenDomain, setChosenDomain] = useState(domains[0]);
  const [chosenMetricKey, setChosenMetricKey] = useState<string | null>(
    metrics[0]?.key ?? null,
  );
  const [hasChanged, setHasChanged] = useState(false);
  const activeDomain = domains.includes(chosenDomain)
    ? chosenDomain
    : domains[0];
  const domainMetrics = metrics.filter(({ domain }) => domain === activeDomain);
  const metric =
    domainMetrics.find(({ key }) => key === chosenMetricKey) ??
    domainMetrics[0];
  const comparison = review.facts.period.comparison;
  const hasComparison = Boolean(
    metric && comparison.available && metric.previousValue !== null,
  );
  return (
    <div data-testid="finale-changes-results">
      {metric ? (
        <>
          <div
            className={styles.domains}
            role="group"
            aria-label="Choose a domain to read"
          >
            {domains.map((domain) => (
              <Button
                key={domain}
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={domain === activeDomain}
                onClick={() => {
                  if (domain === activeDomain) return;
                  setHasChanged(true);
                  setChosenDomain(domain);
                  setChosenMetricKey(null);
                }}
              >
                {domain[0].toUpperCase() + domain.slice(1)}
              </Button>
            ))}
          </div>
          <div className={styles.ledger}>
            <div
              className={styles.index}
              role="group"
              aria-label="Choose a recorded result"
            >
              <p className="eyebrow">Individual results</p>
              {domainMetrics.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-label={`Read result: ${item.label}`}
                  aria-pressed={item.key === metric.key}
                  onClick={() => {
                    if (item.key === metric.key) return;
                    setHasChanged(true);
                    setChosenMetricKey(item.key);
                  }}
                >
                  <span>{item.label}</span>
                  <strong className="timer-numerals">
                    {item.availability === "NOT_RECORDED"
                      ? "Not recorded"
                      : item.valueLabel}
                  </strong>
                </button>
              ))}
            </div>
            <article
              key={metric.key}
              className={styles.focusReading}
              data-testid="finale-changes-result-reading"
              data-metric-key={metric.key}
              data-recompose={hasChanged || undefined}
            >
              <p className="eyebrow">
                {activeDomain[0].toUpperCase() + activeDomain.slice(1)} ·
                Recorded result
              </p>
              <h3>{metric.label}</h3>
              <div className={styles.currentValue}>
                <span>This Season</span>
                <strong className="timer-numerals">
                  {metric.availability === "NOT_RECORDED"
                    ? "Not recorded"
                    : metric.valueLabel}
                </strong>
              </div>
              <div className={styles.comparison}>
                <div>
                  <span>Comparison window</span>
                  <strong className="timer-numerals">
                    {hasComparison
                      ? comparisonValue(metric, metric.previousValue!)
                      : "Unavailable"}
                  </strong>
                </div>
                {metric.deltaLabel && <p>{metric.deltaLabel}</p>}
              </div>
              <details className={styles.detail}>
                <summary>How this is counted & compared</summary>
                <div className={styles.detailBody}>
                  <p>{metric.qualification}</p>
                  <p>
                    {review.facts.period.label} · {review.facts.period.startOn}{" "}
                    — {review.facts.period.endOn} · Europe/Amsterdam.
                  </p>
                  <div>
                    <p className={styles.detailLabel}>Comparison window</p>
                    {hasComparison ? (
                      <>
                        <p>
                          {comparison.label}. From{" "}
                          {formatReviewDate(comparison.start)}; ends before{" "}
                          {formatReviewDate(comparison.end)}.
                        </p>
                        <p>
                          {comparison.mode === "FULL_CALENDAR"
                            ? "The comparison uses complete calendar periods; their lengths may differ."
                            : "The comparison uses equal elapsed windows."}
                        </p>
                      </>
                    ) : (
                      <p>
                        A comparable recorded value is unavailable for this
                        reading.
                      </p>
                    )}
                  </div>
                  <p>
                    {metric.sourceCount} qualifying source{" "}
                    {metric.sourceCount === 1 ? "record" : "records"}.
                  </p>
                </div>
              </details>
              {metric.availability !== "NOT_RECORDED" && (
                <ReviewEvidence view={review} metric={metric} />
              )}
            </article>
          </div>
        </>
      ) : (
        <p className={styles.empty}>
          No qualified results were available for this reading.
        </p>
      )}
      <details className={`${styles.detail} ${styles.coverage}`}>
        <summary>Coverage & period context</summary>
        <div className={styles.detailBody}>
          {review.facts.coverage.map((item) => (
            <div key={item.domain}>
              <p className={styles.detailLabel}>
                {item.domain[0].toUpperCase() + item.domain.slice(1)} ·{" "}
                {item.state === "RECORDED" ? "Recorded" : "Not recorded"}
              </p>
              <p>{item.detail}</p>
            </div>
          ))}
          {review.facts.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </details>
    </div>
  );
}
