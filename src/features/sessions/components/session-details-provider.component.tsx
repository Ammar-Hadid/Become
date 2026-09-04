"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { SessionDetailsDrawer } from "@/features/sessions/components/session-details-drawer.component";
import type { SessionListItem } from "@/features/sessions/session.types";

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
    useState<SessionListItem | null>(null);
  const sessionCache = useRef(new Map<string, SessionListItem>());
  const requestSequence = useRef(0);
  const pageScrollPosition = useRef<number | null>(null);

  const syncFromLocation = useCallback(async () => {
    const sequence = ++requestSequence.current;
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
      url.searchParams.delete(SESSION_QUERY_KEY);
      window.history.replaceState(window.history.state, "", url);
      setSelectedSession(null);
      return;
    }

    const session = (await response.json()) as SessionListItem;
    sessionCache.current.set(session.id, session);
    setSelectedSession(session);
  }, []);

  useEffect(() => {
    const initialSync = window.setTimeout(() => void syncFromLocation(), 0);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncFromLocation]);

  const openSession = useCallback((session: SessionListItem) => {
    if (!session.endedAt) return;

    pageScrollPosition.current = window.scrollY;
    sessionCache.current.set(session.id, session);
    setSelectedSession(session);

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
  }, []);

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
        <SessionDetailsDrawer
          session={selectedSession}
          onClose={closeSession}
        />
      )}
    </SessionDetailsContext.Provider>
  );
}
