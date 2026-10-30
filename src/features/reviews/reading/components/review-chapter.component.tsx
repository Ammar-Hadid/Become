import { Card } from "@/components/ui/cards/card.component";
import type { ReactNode } from "react";
import styles from "../styles/review-reading.module.css";

export function ReviewChapter({
  id,
  number,
  eyebrow,
  title,
  description,
  children,
  aside,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Card
      material="glass"
      className={styles.chapter}
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.chapterHeading}>
        <span className={styles.chapterNumber} aria-hidden="true">
          {number}
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} tabIndex={-1}>
            {title}
          </h2>
          {description && (
            <p className={styles.chapterDescription}>{description}</p>
          )}
        </div>
      </header>
      <div className={aside ? styles.chapterWithAside : styles.chapterBody}>
        <div className={styles.chapterContent}>{children}</div>
        {aside && <aside className={styles.chapterAside}>{aside}</aside>}
      </div>
    </Card>
  );
}
