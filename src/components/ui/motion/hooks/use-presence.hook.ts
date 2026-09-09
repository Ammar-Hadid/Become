"use client";

import { useCallback, useEffect, useState, type AnimationEvent } from "react";
import { MOTION_DURATION_MS } from "@/components/ui/motion/constants/motion.constants";

export type MotionPresenceState = "open" | "closed";

export function usePresence(
  open: boolean,
  exitDuration: number = MOTION_DURATION_MS.fast,
) {
  const [retained, setRetained] = useState(open);
  const isPresent = open || retained;

  useEffect(() => {
    if (open) {
      if (retained) return;
      const frame = window.requestAnimationFrame(() => setRetained(true));
      return () => window.cancelAnimationFrame(frame);
    }
    if (!retained) return;

    const fallback = window.setTimeout(
      () => setRetained(false),
      exitDuration + MOTION_DURATION_MS.feedback,
    );
    return () => window.clearTimeout(fallback);
  }, [exitDuration, open, retained]);

  const onPresenceAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (
        !open &&
        event.target === event.currentTarget &&
        event.animationName.includes("out")
      ) {
        setRetained(false);
      }
    },
    [open],
  );

  return {
    isPresent,
    presenceState: (open ? "open" : "closed") as MotionPresenceState,
    onPresenceAnimationEnd,
  };
}
