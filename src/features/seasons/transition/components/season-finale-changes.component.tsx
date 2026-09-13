"use client";

import { useId, useState, type Ref } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  ReviewMetric,
  ReviewView,
} from "@/features/reviews/contracts/types/review.types";
import { SeasonIntentionJournal } from "./season-intention-journal.component";
import { SeasonResultsReading } from "./season-results-reading.component";
import styles from "../styles/season-finale-changes.module.css";

export function SeasonFinaleChanges({
  review,
  metrics,
  title,
  headingRef,
}: {
  review: ReviewView;
  metrics: ReviewMetric[];
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const id = useId();
  const [lens, setLens] = useState<"intentions" | "results">(
    review.facts.intentions.length ? "intentions" : "results",
  );
  const [hasChanged, setHasChanged] = useState(false);
  function chooseLens(next: typeof lens) {
    if (next === lens) return;
    setHasChanged(true);
    setLens(next);
  }
  return (
    <div className={styles.scene} data-testid="finale-changes-composition">
      <header>
        <p className="eyebrow">03 · What changed</p>
        <h2
          id="finale-passage-2"
          className={styles.title}
          tabIndex={-1}
          ref={headingRef}
        >
          {title}
        </h2>
      </header>
      <div
        className={styles.lenses}
        role="group"
        aria-label="Read intentions or recorded results"
      >
        <Button
          id={`${id}-intentions-button`}
          type="button"
          variant="ghost"
          aria-label="Intentions"
          aria-pressed={lens === "intentions"}
          aria-controls={`${id}-intentions`}
          onClick={() => chooseLens("intentions")}
        >
          <span>Intentions</span>
          <span>Goals & experiments</span>
        </Button>
        <Button
          id={`${id}-results-button`}
          type="button"
          variant="ghost"
          aria-label="Recorded results"
          aria-pressed={lens === "results"}
          aria-controls={`${id}-results`}
          onClick={() => chooseLens("results")}
        >
          <span>Recorded results</span>
          <span>Work, output & outcomes</span>
        </Button>
      </div>
      <div
        id={`${id}-intentions`}
        className={styles.panel}
        role="region"
        aria-labelledby={`${id}-intentions-button`}
        hidden={lens !== "intentions"}
        data-recompose={(lens === "intentions" && hasChanged) || undefined}
      >
        <SeasonIntentionJournal review={review} />
      </div>
      <div
        id={`${id}-results`}
        className={styles.panel}
        role="region"
        aria-labelledby={`${id}-results-button`}
        hidden={lens !== "results"}
        data-recompose={(lens === "results" && hasChanged) || undefined}
      >
        <SeasonResultsReading review={review} metrics={metrics} />
      </div>
    </div>
  );
}
