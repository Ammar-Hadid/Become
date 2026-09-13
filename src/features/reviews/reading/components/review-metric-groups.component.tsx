"use client";

import { useState } from "react";
import type {
  ReviewMetric,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import { ReviewMetrics } from "./review-metrics.component";
import styles from "../styles/review-reading.module.css";

export function ReviewMetricGroups({
  view,
  metrics,
  allowAll = false,
}: {
  view: ReviewView;
  metrics: ReviewMetric[];
  allowAll?: boolean;
}) {
  const domains = [...new Set(metrics.map(({ domain }) => domain))];
  const [chosen, setChosen] = useState(domains[0]);
  const [all, setAll] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const active = domains.includes(chosen) ? chosen : domains[0];
  return (
    <div>
      <div
        className={styles.metricDomains}
        role="group"
        aria-label="Choose a domain to read"
      >
        {domains.map((domain) => (
          <button
            key={domain}
            type="button"
            aria-pressed={!all && domain === active}
            onClick={() => {
              if (all || domain !== active) setHasChanged(true);
              setChosen(domain);
              setAll(false);
            }}
          >
            {domain[0].toUpperCase() + domain.slice(1)}
          </button>
        ))}
        {allowAll && (
          <button
            type="button"
            aria-pressed={all}
            onClick={() => {
              if (!all) setHasChanged(true);
              setAll(true);
            }}
          >
            All domains
          </button>
        )}
      </div>
      <div
        key={all ? "all" : active}
        data-review-recomposed={hasChanged || undefined}
      >
        <ReviewMetrics
          view={view}
          metrics={
            all ? metrics : metrics.filter(({ domain }) => domain === active)
          }
          compact
        />
      </div>
    </div>
  );
}
