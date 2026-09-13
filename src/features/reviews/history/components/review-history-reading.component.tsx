"use client";

import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";

import Link from "next/link";
import { ArrowRight, Check, PenLine } from "lucide-react";
import { useState } from "react";
import type { ReviewHistory } from "@/features/reviews/contracts/types/review.types";
import { TIMEFRAMES, type Timeframe } from "@/lib/dates/utils/period.util";
import styles from "../styles/review-history.module.css";

export function ReviewHistoryReading({
  history,
  entries,
}: {
  history: ReviewHistory;
  entries: { label: string; href: string; timeframe: Timeframe }[];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const items = history.items.filter(
    (item) => !timeframe || item.timeframe === timeframe,
  );
  return (
    <div className={`page-shell ${styles.history}`}>
      <header className={styles.masthead}>
        <p className="eyebrow">Reviews</p>
        <h1>The days, understood.</h1>
        <p>
          Return to what you intended, what happened, and what you want to keep
          from it.
        </p>
      </header>
      <section className={styles.enter} aria-labelledby="review-choose-period">
        <header>
          <p className="eyebrow">Open a reading</p>
          <h2 id="review-choose-period">Choose the distance.</h2>
          <p>
            A week offers a rhythm. A month reveals a pattern. A season holds a
            chapter. A year gives the longer view.
          </p>
        </header>
        <div className={styles.periods}>
          {TIMEFRAMES.map((period) => (
            <div key={period}>
              <h3>{period[0].toUpperCase() + period.slice(1)}</h3>
              {entries
                .filter((entry) => entry.timeframe === period)
                .map((entry) => (
                  <Link key={entry.href} href={entry.href}>
                    {entry.label}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </section>
      <section className={styles.saved} aria-labelledby="review-saved-readings">
        <header>
          <div>
            <p className="eyebrow">Your saved readings</p>
            <h2 id="review-saved-readings">A record you can return to.</h2>
          </div>
          <div className={styles.filters} aria-label="Filter saved reviews">
            <button
              type="button"
              aria-pressed={!timeframe}
              onClick={() => setTimeframe(null)}
            >
              All
            </button>
            {TIMEFRAMES.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={timeframe === period}
                onClick={() => setTimeframe(period)}
              >
                {period[0].toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </header>
        {items.length ? (
          <ol className={styles.readings}>
            {items.map((item) => (
              <li key={`${item.timeframe}:${item.startOn}`}>
                <Link href={item.href}>
                  <div>
                    <p className="eyebrow">{item.label}</p>
                    <h3>
                      {item.title ||
                        `${item.timeframe[0].toUpperCase() + item.timeframe.slice(1)} review`}
                    </h3>
                    <p className={styles.updated}>
                      Saved {formatReviewDate(item.updatedAt)}
                    </p>
                  </div>
                  <span className={styles.status}>
                    {item.status === "FINALIZED" ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <PenLine aria-hidden="true" />
                    )}
                    {item.status === "FINALIZED" ? "Finalized" : "Draft"}
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            <p>
              {history.items.length
                ? "No saved readings at this distance on this page."
                : "Your first saved reading starts here."}
            </p>
            <p>
              {history.items.length
                ? "Choose another distance, or open a period above."
                : "Choose a period above. The record is ready to inspect; additional writing is optional."}
            </p>
          </div>
        )}
        {history.nextCursor && (
          <Link
            className={styles.older}
            href={`/reviews?cursor=${encodeURIComponent(history.nextCursor)}`}
          >
            Older readings <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </section>
    </div>
  );
}
