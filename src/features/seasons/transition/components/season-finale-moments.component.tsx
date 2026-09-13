"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { ReviewMoment } from "@/features/reviews/contracts/types/review.types";
import { ReviewArtwork } from "@/features/reviews/reading/components/review-artwork.component";
import styles from "../styles/season-finale-days.module.css";
import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";

export function SeasonFinaleMoments({
  moments,
  selectedKeys,
}: {
  moments: ReviewMoment[];
  selectedKeys: string[];
}) {
  const [active, setActive] = useState(0);
  const [hasChanged, setHasChanged] = useState(false);
  const moment = moments[Math.min(active, moments.length - 1)];
  if (!moment) return null;
  return (
    <div className={styles.momentCollection}>
      <div className={styles.collectionHeading}>
        <p className="eyebrow">A few moments from the record</p>
        <div role="group" aria-label="Choose a recorded moment">
          {moments.map((item, index) => (
            <button
              key={item.key}
              type="button"
              aria-label={`Read moment ${index + 1}: ${item.label}`}
              aria-pressed={index === active}
              onClick={() => {
                if (index === active) return;
                setHasChanged(true);
                setActive(index);
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
      <article
        key={moment.key}
        className={styles.focusMoment}
        data-recompose={hasChanged || undefined}
        data-artwork={Boolean(moment.imageHref) || undefined}
      >
        <div>
          <p className={styles.momentMetadata}>
            <time dateTime={moment.occurredAt}>
              {formatReviewDate(moment.occurredAt)}
            </time>
            {moment.meaning === "USER_JUDGMENT" && (
              <span>Your recorded judgment</span>
            )}
            {selectedKeys.includes(moment.key) && <span>Kept by you</span>}
          </p>
          <h3>{moment.label}</h3>
          {moment.excerpt && (
            <p className={styles.focusExcerpt}>{moment.excerpt}</p>
          )}
          <details className={styles.momentDetail}>
            <summary>Read the moment & its context</summary>
            {moment.excerpt && <p>{moment.excerpt}</p>}
            {moment.truncated && (
              <p>
                This excerpt is shortened; full wording remains in the source.
              </p>
            )}
            <p>{moment.selectionReason}</p>
            <p>{moment.qualification}</p>
            {moment.href && (
              <Link href={moment.href}>
                Open the source <ArrowUpRight aria-hidden="true" />
              </Link>
            )}
          </details>
        </div>
        {moment.imageHref && <ReviewArtwork src={moment.imageHref} alt="" />}
      </article>
    </div>
  );
}
