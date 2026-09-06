"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { SessionDetailsDrawer } from "@/features/sessions/details/components/session-details-drawer.component";
import { EngineeringSessionDetails } from "@/features/engineering/sessions/components/engineering-session-details.component";
import { FinanceSessionDetails } from "@/features/finance/sessions/components/finance-session-details.component";
import type {
  SessionDetailItem,
  SessionListItem,
} from "@/features/sessions/types/session.types";

type SessionDetailsContextValue = {
  openSession: (session: SessionListItem) => void;
};

export const SessionDetailsContext =
  createContext<SessionDetailsContextValue | null>(null);

const SESSION_QUERY_KEY = "session";
const SESSION_HISTORY_STATE_KEY = "becomeSessionDetails";

export function SessionDetailsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedSession, setSelectedSession] =
    useState<SessionDetailItem | null>(null);
  const sessionCache = useRef(new Map<string, SessionDetailItem>());
  const requestSequence = useRef(0);
  const pageScrollPosition = useRef<number | null>(null);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    const sequence = ++requestSequence.current;
    const cachedSession = sessionCache.current.get(sessionId);
    if (cachedSession) {
      setSelectedSession(cachedSession);
      return;
    }

    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    if (sequence !== requestSequence.current) return;

    if (!response.ok) {
      const url = new URL(window.location.href);
      url.searchParams.delete(SESSION_QUERY_KEY);
      window.history.replaceState(window.history.state, "", url);
      setSelectedSession(null);
      return;
    }

    const session = (await response.json()) as SessionDetailItem;
    sessionCache.current.set(session.id, session);
    setSelectedSession(session);
  }, []);

  const syncFromLocation = useCallback(async () => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get(SESSION_QUERY_KEY);

    if (!sessionId) {
      setSelectedSession(null);
      const scrollTop = pageScrollPosition.current;
      if (scrollTop !== null) {
        window.requestAnimationFrame(() => window.scrollTo(0, scrollTop));
      }
      return;
    }

    await loadSessionDetails(sessionId);
  }, [loadSessionDetails]);

  useEffect(() => {
    const initialSync = window.setTimeout(() => void syncFromLocation(), 0);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncFromLocation]);

  const openSession = useCallback(
    (session: SessionListItem) => {
      if (!session.endedAt) return;

      pageScrollPosition.current = window.scrollY;
      setSelectedSession({ ...session, engineeringEvidence: [] });

      const url = new URL(window.location.href);
      if (url.searchParams.get(SESSION_QUERY_KEY) === session.id) return;
      url.searchParams.set(SESSION_QUERY_KEY, session.id);
      window.history.pushState(
        {
          ...window.history.state,
          [SESSION_HISTORY_STATE_KEY]: true,
        },
        "",
        url,
      );
      void loadSessionDetails(session.id);
    },
    [loadSessionDetails],
  );

  const closeSession = useCallback(() => {
    const url = new URL(window.location.href);
    setSelectedSession(null);

    if (window.history.state?.[SESSION_HISTORY_STATE_KEY] === true) {
      window.history.back();
      return;
    }

    url.searchParams.delete(SESSION_QUERY_KEY);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return (
    <SessionDetailsContext.Provider value={{ openSession }}>
      {children}
      {selectedSession && (
        <SessionDetailsDrawer session={selectedSession} onClose={closeSession}>
          {selectedSession.domain.slug === "finance" && (
            <FinanceSessionDetails session={selectedSession} />
          )}
          {selectedSession.domain.slug === "engineering" && (
            <EngineeringSessionDetails session={selectedSession} />
          )}
        </SessionDetailsDrawer>
      )}
    </SessionDetailsContext.Provider>
  );
}
