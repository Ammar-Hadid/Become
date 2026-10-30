"use client";

import Link from "next/link";
import { ArrowRight, Check, PenLine } from "lucide-react";
import { useContext, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import {
  Workspace,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
import { formatReviewDate } from "@/features/reviews/reading/utils/review-date.util";
import type { ReviewHistory } from "@/features/reviews/contracts/types/review.types";
import { TIMEFRAMES, type Timeframe } from "@/lib/dates/utils/period.util";
import styles from "../styles/review-history.module.css";

const descriptions = {
  week: "Your recent rhythm",
  month: "Patterns across the days",
  season: "A chapter of your life",
  year: "The longer view",
};

export function ReviewHistoryReading({
  history,
  entries,
}: {
  history: ReviewHistory;
  entries: { label: string; href: string; timeframe: Timeframe }[];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const sound = useContext(InterfaceSoundContext);
  const items = history.items.filter(
    (item) => !timeframe || item.timeframe === timeframe,
  );
  function choose(value: Timeframe | null) {
    if (value !== timeframe) sound?.play("controlConfirmed");
    setTimeframe(value);
  }
  return (
    <Workspace area="direction" className={`page-shell ${styles.history}`}>
      <WorkspaceHeader
        eyebrow="Reviews"
        title="See what the days added up to."
        description="Choose a period, read the recorded facts, and keep what matters to you."
      />
      <div className={styles.periodCards} aria-label="Choose a review period">
        {TIMEFRAMES.map((period) => (
          <WorkspacePanel
            key={period}
            title={period[0].toUpperCase() + period.slice(1)}
            description={descriptions[period]}
          >
            <div className={styles.periodLinks}>
              {entries
                .filter((entry) => entry.timeframe === period)
                .map((entry) => (
                  <Link key={entry.href} href={entry.href}>
                    <span>{entry.label}</span>
                    <ArrowRight aria-hidden />
                  </Link>
                ))}
            </div>
          </WorkspacePanel>
        ))}
      </div>
      <WorkspacePanel
        title="Your saved reviews"
        description="Drafts and preserved editions, ready to return to."
        className={styles.savedPanel}
        actions={
          <div
            className={styles.filterButtons}
            aria-label="Filter saved reviews"
          >
            <Button
              variant={!timeframe ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={!timeframe}
              onClick={() => choose(null)}
            >
              All
            </Button>
            {TIMEFRAMES.map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={timeframe === period}
                onClick={() => choose(period)}
              >
                {period[0].toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        }
      >
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
                      <Check aria-hidden />
                    ) : (
                      <PenLine aria-hidden />
                    )}
                    {item.status === "FINALIZED" ? "Finalized" : "Draft"}
                  </span>
                  <ArrowRight aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            pattern={
              history.items.length ? "active-filter" : "editorial-canvas"
            }
            area="direction"
            size="compact"
            title={
              history.items.length
                ? "No saved reviews in this view"
                : "Your first review starts with a period"
            }
            description={
              history.items.length
                ? "Choose another period type or open a reading above."
                : "The recorded facts are already there. Your reflection is optional."
            }
          />
        )}
        {history.nextCursor && (
          <WorkspaceLink
            className={styles.olderAction}
            href={`/reviews?cursor=${encodeURIComponent(history.nextCursor)}`}
          >
            Older readings <ArrowRight />
          </WorkspaceLink>
        )}
      </WorkspacePanel>
    </Workspace>
  );
}
