import type { ReactNode } from "react";
import type { ReviewView } from "@/features/reviews/contracts/types/review.types";
import styles from "../styles/review-reading.module.css";

export function ReviewReadingLayout({
  masthead,
  navigation,
  children,
  timeframe,
}: {
  masthead: ReactNode;
  navigation: ReactNode;
  children: ReactNode;
  timeframe?: ReviewView["facts"]["period"]["timeframe"];
}) {
  return (
    <div
      className={`page-shell ${styles.shell}`}
      data-testid="review-reading"
      data-timeframe={timeframe}
    >
      {masthead}
      <div className={styles.readingLayout}>
        <aside className={styles.contents}>{navigation}</aside>
        <article className={styles.document}>{children}</article>
      </div>
    </div>
  );
}
