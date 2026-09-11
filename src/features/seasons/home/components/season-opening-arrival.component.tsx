"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasDirtyRecordForms } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { isCurrentBecomeSeason } from "@/features/seasons/presentation/utils/current-season.util";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import type { SeasonView } from "@/features/seasons/types/season.types";

function hasCompetingLayer() {
  return Boolean(
    document.querySelector(
      'dialog[open], [role="dialog"][aria-modal="true"]:not([aria-hidden="true"]), [data-modal-layer="open"]',
    ),
  );
}

function hasTimerMutationPending() {
  return document.documentElement.hasAttribute("data-timer-mutation-pending");
}

export function SeasonOpeningArrival({ season }: { season?: SeasonView }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeSession } = useActiveTimer();
  const entering = useRef(false);
  const eligible = Boolean(
    season &&
    !season.openingCompletedAt &&
    !season.closedAt &&
    !season.openingDeferred &&
    isCurrentBecomeSeason(season.year, season.quarter) &&
    season.calendar.phase !== "UPCOMING" &&
    season.calendar.phase !== "ENDED",
  );

  useEffect(() => {
    if (!eligible || pathname !== "/" || activeSession || !season) return;

    let interactionStarted = false;
    const stopForInteraction = () => {
      interactionStarted = true;
    };
    const enter = () => {
      if (
        entering.current ||
        interactionStarted ||
        window.location.search !== "" ||
        window.location.hash !== "" ||
        document.visibilityState !== "visible" ||
        hasTimerMutationPending() ||
        hasDirtyRecordForms() ||
        hasCompetingLayer()
      )
        return;
      entering.current = true;
      router.replace(
        `/direction/seasons/${season.year}/${season.quarter}/opening?arrival=season`,
        { scroll: false },
      );
    };

    document.addEventListener("pointerdown", stopForInteraction, {
      capture: true,
      once: true,
    });
    document.addEventListener("keydown", stopForInteraction, {
      capture: true,
      once: true,
    });
    const frame = window.requestAnimationFrame(enter);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", stopForInteraction, true);
      document.removeEventListener("keydown", stopForInteraction, true);
    };
  }, [activeSession, eligible, pathname, router, season]);

  return null;
}
