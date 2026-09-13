"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import { readTransitionSuppression } from "../utils/transition-storage.util";
import { readOpeningPause } from "@/features/seasons/opening/utils/opening-recovery.util";
import type { SeasonView } from "@/features/seasons/types/season.types";
import styles from "../styles/season-transition-entry.module.css";

export function SeasonTransitionEntry({
  view,
  season,
  recoveryScope,
}: {
  view?: SeasonTransitionView | null;
  season?: SeasonView;
  recoveryScope?: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const read = () =>
      setNotice(
        (season && !season.openingCompletedAt
          ? readOpeningPause(recoveryScope ?? season.id).notice
          : null) ??
          (view && view.disposition !== "COMPLETED"
            ? readTransitionSuppression(view).notice
            : null),
      );
    read();
    window.addEventListener("become:season-transition-suppressed", read);
    return () =>
      window.removeEventListener("become:season-transition-suppressed", read);
  }, [recoveryScope, season, view]);
  const unfinished = Boolean(
    view?.from && view.finaleHref && view.disposition !== "COMPLETED",
  );
  return (
    <section
      className={styles.entry}
      aria-label="Reviews and Season transition"
    >
      <div>
        <BookOpen aria-hidden="true" />
        <p>
          {unfinished
            ? `${view!.from!.label} has a chapter to close.`
            : "An honest reading of the days behind you."}
        </p>
      </div>
      <div className={styles.links}>
        {unfinished && (
          <Link
            href={
              view?.disposition === "SKIPPED"
                ? `${view.finaleHref}?replay=1`
                : view!.finaleHref!
            }
          >
            {view?.disposition === "SKIPPED"
              ? "Revisit the finale"
              : view?.disposition === "AVAILABLE"
                ? "Read the finale"
                : "Resume the finale"}
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
        <Link href="/reviews">
          Reviews
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
