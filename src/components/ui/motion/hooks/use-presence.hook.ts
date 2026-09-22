"use client";

import { useCallback, useEffect, useState, type AnimationEvent } from "react";
import {
  resolveMotionFallbackMs,
  type MotionDuration,
} from "@/components/ui/motion/utils/motion-time.util";

export type MotionPresenceState = "open" | "closed";

export function usePresence(
  open: boolean,
  exitDuration: MotionDuration = "control",
) {
  const [retained, setRetained] = useState(open);
  const isPresent = open || retained;

  const completeExit = useCallback(() => {
    if (!open) setRetained(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      if (retained) return;
      const retainFrame = window.requestAnimationFrame(() => setRetained(true));
      return () => window.cancelAnimationFrame(retainFrame);
    }
    if (!retained) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishForReducedMotion = () => {
      if (reducedMotion.matches) setRetained(false);
    };
    finishForReducedMotion();
    const fallback = window.setTimeout(
      () => setRetained(false),
      resolveMotionFallbackMs(exitDuration),
    );
    reducedMotion.addEventListener("change", finishForReducedMotion);
    return () => {
      window.clearTimeout(fallback);
      reducedMotion.removeEventListener("change", finishForReducedMotion);
    };
  }, [exitDuration, open, retained]);

  const onPresenceAnimationComplete = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) completeExit();
    },
    [completeExit],
  );

  return {
    isPresent,
    isExiting: isPresent && !open,
    presenceState: (open ? "open" : "closed") as MotionPresenceState,
    completeExit,
    onPresenceAnimationEnd: onPresenceAnimationComplete,
  };
}
