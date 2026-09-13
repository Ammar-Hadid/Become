import type { ReviewIdentity } from "@/features/reviews/contracts/types/review.types";
import { formatReviewDate } from "../utils/review-date.util";
import styles from "../styles/review-reading.module.css";

export function ReviewSeasonDirection({
  identity,
  compact = false,
}: {
  identity: ReviewIdentity;
  compact?: boolean;
}) {
  const hasOriginal = identity.originalIntention != null;
  const direction = hasOriginal
    ? identity.originalIntention!
    : identity.intention;
  const wording =
    direction ||
    (hasOriginal
      ? "No intention was written in the original Season opening."
      : "A Season direction was not recorded in this reading.");
  return (
    <div
      className={styles.directionReading}
      data-compact={compact || undefined}
    >
      <blockquote className={styles.openingIntention}>
        <p>{wording}</p>
      </blockquote>
      <details className={styles.directionDetail}>
        <summary>
          {hasOriginal ? "Original Season intention" : "Saved Season direction"}
          {compact ? " · read in full" : " · history"}
        </summary>
        {compact && <p>{wording}</p>}
        {hasOriginal && identity.originalRecordedAt && (
          <p>Recorded {formatReviewDate(identity.originalRecordedAt)}.</p>
        )}
        {(identity.intentionCoverage || !hasOriginal) && (
          <p>
            {identity.intentionCoverage ||
              "This record does not reconstruct the original Season wording."}
          </p>
        )}
        {hasOriginal && identity.intention !== identity.originalIntention && (
          <div>
            <p className="eyebrow">Current saved direction</p>
            <p>{identity.intention || "No current intention was recorded."}</p>
          </div>
        )}
      </details>
    </div>
  );
}
