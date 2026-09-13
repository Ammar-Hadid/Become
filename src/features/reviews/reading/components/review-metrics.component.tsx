import type {
  ReviewMetric,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import { ReviewEvidence } from "@/features/reviews/evidence/components/review-evidence.component";
import styles from "../styles/review-reading.module.css";

export function ReviewMetrics({
  view,
  metrics,
  compact = false,
}: {
  view: ReviewView;
  metrics: ReviewMetric[];
  compact?: boolean;
}) {
  return (
    <div className={styles.metrics}>
      {metrics.map((metric) => (
        <article key={metric.key} className={styles.metric}>
          <p>{metric.label}</p>
          <strong className="timer-numerals">
            {metric.availability === "NOT_RECORDED"
              ? "Not recorded"
              : metric.valueLabel}
          </strong>
          {metric.deltaLabel && (
            <span className={styles.metricDelta}>{metric.deltaLabel}</span>
          )}
          {compact ? (
            <details className={styles.sourceMeaning}>
              <summary>How this is counted</summary>
              <p>{metric.qualification}</p>
            </details>
          ) : (
            <p className={styles.annotation}>{metric.qualification}</p>
          )}
          {metric.availability !== "NOT_RECORDED" && (
            <ReviewEvidence view={view} metric={metric} />
          )}
        </article>
      ))}
    </div>
  );
}
