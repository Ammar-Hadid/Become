"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasDirtyRecordForms } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { isCurrentBecomeSeason } from "@/features/seasons/presentation/utils/current-season.util";
import { useActiveTimer } from "@/features/sessions/timer/hooks/use-active-timer.hook";
import type { SeasonView } from "@/features/seasons/types/season.types";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import { readTransitionSuppression } from "@/features/seasons/transition/utils/transition-storage.util";

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

export function SeasonOpeningArrival({
  season,
  transition,
  transitionUnavailable = false,
  recoveryScope,
}: {
  season?: SeasonView;
  transition?: SeasonTransitionView | null;
  transitionUnavailable?: boolean;
  recoveryScope?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeSession, pendingOperation, recoveryRequired, reconcileTimer } =
    useActiveTimer();
  const entering = useRef(false);
  const interactionStarted = useRef(false);
  const occupation = useRef(
    Boolean(activeSession || pendingOperation || recoveryRequired),
  );
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
    occupation.current = Boolean(
      activeSession || pendingOperation || recoveryRequired,
    );
  }, [activeSession, pendingOperation, recoveryRequired]);

  useEffect(() => {
    const stopForInteraction = () => {
      interactionStarted.current = true;
    };
    document.addEventListener("pointerdown", stopForInteraction, {
      capture: true,
    });
    document.addEventListener("keydown", stopForInteraction, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", stopForInteraction, true);
      document.removeEventListener("keydown", stopForInteraction, true);
    };
  }, []);

  useEffect(() => {
    if (
      transitionUnavailable ||
      pathname !== "/" ||
      occupation.current ||
      entering.current
    )
      return;
    const transitionReady = Boolean(
      transition?.autoEligible &&
      transition.finaleHref &&
      !transition.occupied &&
      !readTransitionSuppression(transition).suppressed,
    );
    // A prior participating Season takes the place of automatic opening. A
    // deferred/skipped finale leaves both paths available through manual entry.
    if (
      transition?.from &&
      transition.disposition !== "COMPLETED" &&
      !transitionReady
    )
      return;
    if (!transitionReady && (!eligible || !season)) return;
    let cancelled = false;
    let frame: number | null = null;
    const enter = () => {
      if (
        cancelled ||
        entering.current ||
        interactionStarted.current ||
        occupation.current ||
        window.location.search !== "" ||
        window.location.hash !== "" ||
        document.visibilityState !== "visible" ||
        hasTimerMutationPending() ||
        hasDirtyRecordForms() ||
        hasCompetingLayer()
      )
        return;
      if (transition && readTransitionSuppression(transition).suppressed)
        return;
      if (season) {
        try {
          if (
            sessionStorage.getItem(
              `become:opening-deferred:${recoveryScope ?? season.id}`,
            )
          )
            return;
        } catch {
          /* The saved backend disposition and URL still apply. */
        }
      }
      entering.current = true;
      router.replace(
        transitionReady && transition?.finaleHref
          ? `${transition.finaleHref}?arrival=season`
          : `/direction/seasons/${season!.year}/${season!.quarter}/opening?arrival=season`,
        { scroll: false },
      );
    };

    // Wait for a successful timer reconciliation on this Home visit. The
    // animation frame observes its committed running/paused occupation state.
    void reconcileTimer().then((confirmed) => {
      if (confirmed && !cancelled) frame = window.requestAnimationFrame(enter);
    });
    return () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [
    activeSession,
    eligible,
    pathname,
    pendingOperation,
    reconcileTimer,
    recoveryRequired,
    recoveryScope,
    router,
    season,
    transition,
    transitionUnavailable,
  ]);

  return null;
}
