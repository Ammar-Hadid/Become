"use client";

import { useContext, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
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
  const sound = useContext(InterfaceSoundContext);
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
          <Button
            variant={!all && domain === active ? "secondary" : "ghost"}
            size="sm"
            key={domain}
            type="button"
            aria-pressed={!all && domain === active}
            onClick={() => {
              if (all || domain !== active) {
                setHasChanged(true);
                sound?.play("controlConfirmed");
              }
              setChosen(domain);
              setAll(false);
            }}
          >
            {domain[0].toUpperCase() + domain.slice(1)}
          </Button>
        ))}
        {allowAll && (
          <Button
            variant={all ? "secondary" : "ghost"}
            size="sm"
            type="button"
            aria-pressed={all}
            onClick={() => {
              if (!all) {
                setHasChanged(true);
                sound?.play("controlConfirmed");
              }
              setAll(true);
            }}
          >
            All domains
          </Button>
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
