"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { ReviewView } from "@/features/reviews/contracts/types/review.types";
import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";
import styles from "../styles/season-finale-changes.module.css";

export function SeasonIntentionJournal({ review }: { review: ReviewView }) {
  const { intentions } = review.facts;
  const [chosenKey, setChosenKey] = useState(
    intentions[0] ? `${intentions[0].kind}:${intentions[0].id}` : null,
  );
  const [hasChanged, setHasChanged] = useState(false);
  const intention =
    intentions.find(({ kind, id }) => `${kind}:${id}` === chosenKey) ??
    intentions[0];
  return (
    <div data-testid="finale-changes-intentions">
      {intention ? (
        <div className={styles.journal}>
          <div
            className={styles.index}
            role="group"
            aria-label="Choose an intention to read"
          >
            <p className="eyebrow">Your chosen directions</p>
            {intentions.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                aria-label={`Read intention: ${item.title}`}
                aria-pressed={
                  item.kind === intention.kind && item.id === intention.id
                }
                onClick={() => {
                  if (item.kind === intention.kind && item.id === intention.id)
                    return;
                  setHasChanged(true);
                  setChosenKey(`${item.kind}:${item.id}`);
                }}
              >
                <span className={styles.indexKind}>
                  {item.kind === "GOAL" ? "Goal" : "Experiment"}
                </span>
                <span>{item.title}</span>
                <span className={styles.indexStatus}>
                  {item.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </button>
            ))}
          </div>
          <article
            key={`${intention.kind}-${intention.id}`}
            className={styles.focusReading}
            data-testid="finale-changes-intention-reading"
            data-intention-key={`${intention.kind}:${intention.id}`}
            data-recompose={hasChanged || undefined}
          >
            <div className={styles.entryHeading}>
              <div>
                <p className="eyebrow">
                  {intention.kind === "GOAL" ? "Goal" : "Experiment"}
                </p>
                <h3>{intention.title}</h3>
              </div>
              <span className={styles.savedStatus}>
                <span>Saved status</span>
                <strong>
                  {intention.status.replaceAll("_", " ").toLowerCase()}
                </strong>
              </span>
            </div>
            <dl className={styles.wordingJourney}>
              <div>
                <dt>At the beginning</dt>
                <dd className={styles.wordingExcerpt}>
                  {intention.original ||
                    "The original wording cannot be reconstructed from saved history."}
                </dd>
                {intention.originalRecordedAt && (
                  <dd className={styles.annotation}>
                    Recorded {formatReviewDate(intention.originalRecordedAt)}
                  </dd>
                )}
              </div>
              <div>
                <dt>Latest saved wording</dt>
                <dd className={styles.wordingExcerpt}>{intention.current}</dd>
              </div>
            </dl>
            <div className={styles.recordedProgress}>
              <span>Recorded progress</span>
              <p className={styles.progressExcerpt}>{intention.progress}</p>
              {intention.criteriaReached !== null && (
                <p className={styles.annotation}>
                  {intention.criteriaReached
                    ? "Recorded criteria reached"
                    : "Recorded criteria not yet reached"}
                </p>
              )}
            </div>
            {intention.conclusion && (
              <div className={styles.conclusion}>
                <span>Your conclusion</span>
                <p className={styles.wordingExcerpt}>{intention.conclusion}</p>
              </div>
            )}
            <details className={styles.detail}>
              <summary>Read wording, targets & history</summary>
              <div className={styles.detailBody}>
                <dl>
                  <div>
                    <dt>At the beginning · full wording</dt>
                    <dd>
                      {intention.original ||
                        "The original wording cannot be reconstructed from saved history."}
                    </dd>
                    {intention.originalTarget && (
                      <dd>Original target: {intention.originalTarget}</dd>
                    )}
                    {intention.originalRecordedAt && (
                      <dd>
                        Recorded{" "}
                        {formatReviewDate(intention.originalRecordedAt)}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt>Latest saved wording · in full</dt>
                    <dd>{intention.current}</dd>
                    <dd>{intention.progress}</dd>
                    {intention.criteriaReached !== null && (
                      <dd>
                        {intention.criteriaReached
                          ? "Recorded criteria reached"
                          : "Recorded criteria not yet reached"}
                      </dd>
                    )}
                  </div>
                </dl>
                {intention.conclusion && (
                  <div>
                    <p className={styles.detailLabel}>
                      Your conclusion · in full
                    </p>
                    <p>{intention.conclusion}</p>
                  </div>
                )}
                {intention.historyCoverage && (
                  <p>{intention.historyCoverage}</p>
                )}
                {intention.changes.length > 0 && (
                  <div>
                    <p className={styles.detailLabel}>
                      What changed along the way
                    </p>
                    <ol className={styles.revisions}>
                      {intention.changes.map((change) => (
                        <li key={change.id}>
                          <time dateTime={change.occurredAt}>
                            {formatReviewDate(change.occurredAt)}
                          </time>
                          <p>{change.reason || "A recorded revision"}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </details>
            <Link className={styles.sourceLink} href={intention.href}>
              Open the {intention.kind === "GOAL" ? "goal" : "experiment"}{" "}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </article>
        </div>
      ) : (
        <p className={styles.empty}>
          No goal or experiment history was recorded for this season.
        </p>
      )}
      {review.facts.omitted.intentions > 0 && (
        <p className={styles.coverageNote}>
          {review.facts.omitted.intentions} additional intentions remain
          available in Direction. This reading shows a bounded selection.{" "}
          <Link href="/direction">Open Direction</Link>
        </p>
      )}
    </div>
  );
}
