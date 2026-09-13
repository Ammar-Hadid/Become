import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { PeriodReviewFacts } from "@/features/reviews/contracts/types/review.types";
import styles from "../styles/review-reading.module.css";

export function ReviewSeasonChapters({
  chapters,
}: {
  chapters: NonNullable<PeriodReviewFacts["seasonChapters"]>;
}) {
  return (
    <details className={styles.recordCoverage}>
      <summary>The Seasons within this reading · {chapters.length}</summary>
      <div className={styles.seasonChapters}>
        {chapters.map((chapter) => (
          <details key={`${chapter.year}-${chapter.quarter}`}>
            <summary>
              <span>
                <span className="eyebrow">
                  Season {chapter.quarter} · {chapter.year}
                </span>
                <span>{chapter.title || "A saved Season"}</span>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className={styles.seasonChapterCopy}>
              <p className="eyebrow">Saved Season direction</p>
              <blockquote>
                {chapter.intention || "A Season direction was not recorded."}
              </blockquote>
              {chapter.characterName && (
                <p className={styles.annotation}>
                  Your chosen inspiration: {chapter.characterName}
                </p>
              )}
              <Link href={chapter.href}>
                Open this Season <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
