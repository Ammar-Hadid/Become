import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReviewIntention } from "@/features/reviews/contracts/types/review.types";
import styles from "../styles/review-reading.module.css";
import { formatReviewDate } from "../utils/review-date.util";

export function ReviewIntentions({
  intentions,
}: {
  intentions: ReviewIntention[];
}) {
  return (
    <div className={styles.intentions}>
      {intentions.map((intention) => (
        <article
          key={`${intention.kind}-${intention.id}`}
          className={styles.intention}
        >
          <div className={styles.intentionHeader}>
            <div>
              <p className="eyebrow">
                {intention.kind === "GOAL" ? "Intention" : "Experiment"}
              </p>
              <Link href={intention.href}>
                {intention.title}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
            <span>{intention.status.replaceAll("_", " ").toLowerCase()}</span>
          </div>
          <dl className={styles.intentionReading}>
            <div>
              <dt>At the beginning</dt>
              <dd>
                {intention.original ||
                  "The original wording cannot be reconstructed from saved history."}
              </dd>
              {intention.originalTarget && (
                <dd className={styles.annotation}>
                  Original target: {intention.originalTarget}
                </dd>
              )}
              {intention.originalRecordedAt && (
                <dd className={styles.annotation}>
                  Recorded {formatReviewDate(intention.originalRecordedAt)}
                </dd>
              )}
            </div>
            <div>
              <dt>The reading now</dt>
              <dd>{intention.current}</dd>
              <dd className={styles.annotation}>{intention.progress}</dd>
              {intention.criteriaReached !== null && (
                <dd className={styles.annotation}>
                  {intention.criteriaReached
                    ? "Recorded criteria reached"
                    : "Recorded criteria not yet reached"}
                </dd>
              )}
            </div>
          </dl>
          {intention.conclusion && (
            <p className={styles.intentionConclusion}>
              <span>Your conclusion</span>
              {intention.conclusion}
            </p>
          )}
          {intention.historyCoverage && (
            <p className={styles.annotation}>{intention.historyCoverage}</p>
          )}
          {intention.changes.length > 0 && (
            <details className={styles.intentionChanges}>
              <summary>What changed along the way</summary>
              <ol>
                {intention.changes.map((change) => (
                  <li key={change.id}>
                    <time dateTime={change.occurredAt}>
                      {formatReviewDate(change.occurredAt)}
                    </time>
                    <p>{change.reason || "A recorded revision"}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
