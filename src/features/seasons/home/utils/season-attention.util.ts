import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { isCurrentBecomeSeason } from "@/features/seasons/presentation/utils/current-season.util";

export type SeasonAttentionItem = {
  id: string;
  text: string;
  href: string;
  area: "season";
  detail?: string;
};

export function getSeasonAttentionItems({
  season,
  transition,
  transitionUnavailable,
  openingNotice,
  transitionNotice,
  now,
}: {
  season: SeasonView;
  transition?: SeasonTransitionView | null;
  transitionUnavailable: boolean;
  openingNotice?: string | null;
  transitionNotice?: string | null;
  now?: Date;
}): SeasonAttentionItem[] {
  const items: SeasonAttentionItem[] = [];

  if (transitionUnavailable) {
    items.push({
      id: "season-transition-unavailable",
      text: "The Season transition could not be loaded. Open Reviews.",
      href: "/reviews",
      area: "season",
    });
  } else if (
    transition?.from &&
    transition.finaleHref &&
    transition.disposition !== "COMPLETED"
  ) {
    const { disposition, from, finaleHref } = transition;
    const skipped = disposition === "SKIPPED";
    items.push({
      id: `season-finale-${from.startOn}`,
      text: skipped
        ? `Revisit the ${from.label} finale.`
        : disposition === "AVAILABLE"
          ? `${from.label} has a chapter to close. Read the finale.`
          : `${from.label} finale is paused. Resume the finale.`,
      href: skipped ? `${finaleHref}?replay=1` : finaleHref,
      area: "season",
      ...(transitionNotice && !skipped ? { detail: transitionNotice } : {}),
    });
  }

  if (
    !season.openingCompletedAt &&
    !season.closedAt &&
    isCurrentBecomeSeason(season.year, season.quarter, now) &&
    season.calendar.phase !== "UPCOMING" &&
    season.calendar.phase !== "ENDED"
  ) {
    const paused = season.openingDeferred || Boolean(openingNotice);
    items.push({
      id: `season-opening-${season.year}-${season.quarter}`,
      text: paused
        ? `${season.calendar.label} opening is paused. Resume the opening.`
        : `${season.calendar.label} is ready. Begin the opening.`,
      href: `/direction/seasons/${season.year}/${season.quarter}/opening`,
      area: "season",
      ...(openingNotice ? { detail: openingNotice } : {}),
    });
  }

  return items;
}
