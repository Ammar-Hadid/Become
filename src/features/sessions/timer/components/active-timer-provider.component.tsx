"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ActiveSessionData,
  ActiveTimerState,
  SessionDetailItem,
} from "@/features/sessions/types/session.types";
import { calculateElapsedSeconds } from "@/features/sessions/timer/utils/elapsed-time.util";

export const ActiveTimerContext = createContext<ActiveTimerState | null>(null);

export function ActiveTimerProvider({
  activeSession: serverActiveSession,
  children,
}: {
  activeSession: ActiveSessionData | null;
  children: React.ReactNode;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [startedSession, setStartedSession] =
    useState<ActiveSessionData | null>(null);
  const confirmStart = useCallback((session: ActiveSessionData) => {
    setStartedSession(session);
    setNowMs(Date.now());
  }, []);
  // Keep the start acknowledgement only until the layout catches up. Later
  // server refreshes must still be able to report a stop from another tab.
  if (
    startedSession &&
    serverActiveSession &&
    serverActiveSession.startedAt >= startedSession.startedAt
  ) {
    setStartedSession(null);
  }
  const [completedSessions, setCompletedSessions] = useState<
    Record<string, SessionDetailItem>
  >({});
  const confirmCompletion = useCallback((session: SessionDetailItem) => {
    setCompletedSessions((completed) => ({
      ...completed,
      [session.id]: session,
    }));
  }, []);
  // Confirmed server mutations take precedence over an older layout payload.
  const latestSession =
    startedSession &&
    (!serverActiveSession ||
      startedSession.startedAt >= serverActiveSession.startedAt)
      ? startedSession
      : serverActiveSession;
  const activeSession =
    latestSession && !completedSessions[latestSession.id]
      ? latestSession
      : null;

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
      completedSessions,
      confirmCompletion,
      confirmStart,
      elapsedSeconds: activeSession
        ? nowMs === null
          ? activeSession.durationSeconds
          : calculateElapsedSeconds(activeSession.startedAt, nowMs)
        : 0,
    }),
    [activeSession, nowMs, completedSessions, confirmCompletion, confirmStart],
  );

  return (
    <ActiveTimerContext.Provider value={value}>
      {children}
    </ActiveTimerContext.Provider>
  );
}
