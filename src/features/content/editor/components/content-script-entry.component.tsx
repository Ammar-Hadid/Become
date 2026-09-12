import type { MouseEventHandler } from "react";
import Link from "next/link";
import { ArrowUpRight, PenLine } from "lucide-react";
import styles from "./content-script-entry.module.css";

export function ContentScriptEntry({
  hasContent,
  href,
  opening,
  onNavigate,
  wordCount,
}: {
  hasContent: boolean;
  href: string;
  opening: boolean;
  onNavigate: MouseEventHandler<HTMLAnchorElement>;
  wordCount: number;
}) {
  const label = hasContent ? "Open script" : "Write script";

  return (
    <div className={styles.shell}>
      <Link
        href={href}
        prefetch={false}
        data-record-save-link
        data-state={hasContent ? "saved" : "empty"}
        aria-label={label}
        aria-disabled={opening || undefined}
        aria-busy={opening || undefined}
        className={styles.entry}
        onClick={onNavigate}
      >
        <span className={styles.guide} aria-hidden="true">
          <span className={styles.icon}>
            <PenLine />
          </span>
        </span>

        <span className={styles.copy}>
          <span className={styles.eyebrow}>
            <span>Script</span>
            <span className={styles.state}>
              {hasContent ? "Saved draft" : "Not started"}
            </span>
          </span>
          <span className={styles.title}>
            {label}
            <ArrowUpRight aria-hidden="true" />
          </span>
          <span className={styles.description}>
            {hasContent
              ? "The full draft is attached to this variant."
              : "Turn this shape into the full spoken draft."}
          </span>
        </span>

        <span className={styles.measure}>
          <span className={styles.wordCount}>{wordCount.toLocaleString()}</span>
          <span className={styles.wordLabel}>
            {wordCount === 1 ? "word" : "words"}
          </span>
          {opening && (
            <span className={styles.saving} role="status">
              Saving writing…
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}
