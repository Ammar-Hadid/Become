"use client";

import { useEffect, useMemo, useState } from "react";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { readOpeningPause } from "@/features/seasons/opening/utils/opening-recovery.util";
import { readTransitionSuppression } from "@/features/seasons/transition/utils/transition-storage.util";
import { getSeasonAttentionItems } from "../utils/season-attention.util";

export function useSeasonAttention({
  season,
  transition,
  transitionUnavailable,
  recoveryScope,
}: {
  season: SeasonView;
  transition?: SeasonTransitionView | null;
  transitionUnavailable: boolean;
  recoveryScope?: string;
}) {
  const [notices, setNotices] = useState<{
    opening: string | null;
    transition: string | null;
  }>({
    opening: null,
    transition: null,
  });

  useEffect(() => {
    const read = () =>
      setNotices({
        opening: !season.openingCompletedAt
          ? readOpeningPause(recoveryScope ?? season.id).notice
          : null,
        transition:
          transition?.from && transition.disposition !== "COMPLETED"
            ? readTransitionSuppression(transition).notice
            : null,
      });
    read();
    window.addEventListener("become:season-transition-suppressed", read);
    return () =>
      window.removeEventListener("become:season-transition-suppressed", read);
  }, [recoveryScope, season, transition]);

  return useMemo(
    () =>
      getSeasonAttentionItems({
        season,
        transition,
        transitionUnavailable,
        openingNotice: notices.opening,
        transitionNotice: notices.transition,
      }),
    [
      season,
      transition,
      transitionUnavailable,
      notices.opening,
      notices.transition,
    ],
  );
}
