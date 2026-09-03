"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type {
  ActiveSessionData,
  ActiveTimerState,
} from "@/features/sessions/session.types";
import { calculateElapsedSeconds } from "@/features/sessions/elapsed-time.util";

export const ActiveTimerContext = createContext<ActiveTimerState | null>(null);

export function ActiveTimerProvider({
  activeSession,
  children,
}: {
  activeSession: ActiveSessionData | null;
  children: React.ReactNode;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!activeSession) return;

    const update = () => setNowMs(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const value = useMemo<ActiveTimerState>(
    () => ({
      activeSession,
      elapsedSeconds: activeSession
        ? nowMs === null
          ? activeSession.durationSeconds
          : calculateElapsedSeconds(activeSession.startedAt, nowMs)
        : 0,
    }),
    [activeSession, nowMs],
  );

  return (
    <ActiveTimerContext.Provider value={value}>
      {children}
    </ActiveTimerContext.Provider>
  );
}
