"use client";

import { useContext } from "react";
import { ActiveTimerContext } from "@/features/sessions/components/active-timer-provider.component";

export function useActiveTimer() {
  const timer = useContext(ActiveTimerContext);
  if (!timer) {
    throw new Error("useActiveTimer must be used within ActiveTimerProvider.");
  }
  return timer;
}
