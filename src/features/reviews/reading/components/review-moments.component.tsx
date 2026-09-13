"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, BookmarkCheck } from "lucide-react";
import type { ReviewMoment } from "@/features/reviews/contracts/types/review.types";
import { Button } from "@/components/ui/buttons/button.component";
import { ReviewArtwork } from "./review-artwork.component";
import styles from "../styles/review-reading.module.css";
import { formatReviewDate } from "../utils/review-date.util";

export function ReviewMoments({
  moments,
  selectedKeys,
  editable,
  onToggle,
  disabled = false,
}: {
  moments: ReviewMoment[];
  selectedKeys: string[];
  editable: boolean;
  onToggle?: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <ol className={styles.moments}>
      {moments.map((moment) => {
        const selected = selectedKeys.includes(moment.key);
        return (
          <li
            key={moment.key}
            className={styles.moment}
            data-artwork={Boolean(moment.imageHref) || undefined}
          >
            {moment.imageHref && (
              <ReviewArtwork src={moment.imageHref} alt="" />
            )}
            <div className={styles.momentCopy}>
              <div className={styles.momentMeta}>
                <time dateTime={moment.occurredAt}>
                  {formatReviewDate(moment.occurredAt)}
                </time>
                <span>
                  {moment.meaning === "USER_JUDGMENT"
                    ? "Your recorded judgment"
                    : moment.kind.replaceAll("_", " ").toLowerCase()}
                </span>
              </div>
              <div className={styles.momentHeading}>
                {moment.href ? (
                  <Link href={moment.href}>
                    {moment.label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                ) : (
                  <h3>{moment.label}</h3>
                )}
                {editable && onToggle && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`${selected ? "Remove" : "Keep"} ${moment.label} ${selected ? "from" : "in"} this review`}
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => onToggle(moment.key)}
                  >
                    {selected ? (
                      <BookmarkCheck aria-hidden="true" />
                    ) : (
                      <Bookmark aria-hidden="true" />
                    )}
                  </Button>
                )}
              </div>
              {moment.excerpt && (
                <p className={styles.momentExcerpt}>{moment.excerpt}</p>
              )}
              {moment.truncated && (
                <p className={styles.annotation}>
                  Excerpt shortened. The full wording remains in the source.
                </p>
              )}
              {selected && <p className={styles.momentReason}>Kept by you</p>}
              <details className={styles.sourceMeaning}>
                <summary>Why this moment appears</summary>
                <p>{moment.selectionReason}</p>
                {moment.qualification && <p>{moment.qualification}</p>}
              </details>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
