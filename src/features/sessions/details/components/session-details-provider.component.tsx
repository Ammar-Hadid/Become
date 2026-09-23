"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BusinessSessionDetails } from "@/features/entrepreneurship/sessions/components/business-session-details.component";
import {
  createContext,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
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
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sessionCache = useRef(new Map<string, SessionDetailItem>());
  const requestSequence = useRef(0);
  const pageScrollPosition = useRef<number | null>(null);
  const pageScrollPathname = useRef<string | null>(null);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    const sequence = ++requestSequence.current;
    const cachedSession = sessionCache.current.get(sessionId);
    if (cachedSession) {
      setSelectedSession(cachedSession);
      setDrawerOpen(true);
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
      setDrawerOpen(false);
      return;
    }

    const session = (await response.json()) as SessionDetailItem;
    if (sequence !== requestSequence.current) return;
    sessionCache.current.set(session.id, session);
    setSelectedSession(session);
    setDrawerOpen(true);
  }, []);

  const syncSelection = useCallback(
    async (pathname: string, sessionId: string | null) => {
      // The dedicated capture page owns its session parameter and its UI.
      if (!sessionId || pathname === "/entrepreneurship/interactions/capture") {
        requestSequence.current += 1;
        setDrawerOpen(false);
        const scrollTop = pageScrollPosition.current;
        if (scrollTop !== null && pageScrollPathname.current === pathname) {
          window.requestAnimationFrame(() => window.scrollTo(0, scrollTop));
        }
        return;
      }
      await loadSessionDetails(sessionId);
    },
    [loadSessionDetails],
  );

  const syncFromLocation = useCallback(async () => {
    const url = new URL(window.location.href);
    await syncSelection(url.pathname, url.searchParams.get(SESSION_QUERY_KEY));
  }, [syncSelection]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncFromLocation]);

  const openSession = useCallback(
    (session: SessionListItem) => {
      if (!session.endedAt) return;

      if (pageScrollPathname.current !== window.location.pathname) {
        pageScrollPathname.current = window.location.pathname;
        pageScrollPosition.current = window.scrollY;
      } else if (pageScrollPosition.current === null) {
        pageScrollPosition.current = window.scrollY;
      }
      setSelectedSession({ ...session, engineeringEvidence: [] });
      setDrawerOpen(true);

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
    requestSequence.current += 1;
    setDrawerOpen(false);

    if (window.history.state?.[SESSION_HISTORY_STATE_KEY] === true) {
      window.history.back();
      return;
    }

    url.searchParams.delete(SESSION_QUERY_KEY);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const sessionUpdated = useCallback(
    (session: SessionDetailItem) => {
      requestSequence.current += 1;
      sessionCache.current.set(session.id, session);
      setSelectedSession(session);
      router.refresh();
    },
    [router],
  );

  return (
    <SessionDetailsContext.Provider value={{ openSession }}>
      <Suspense fallback={null}>
        <SessionDetailsLocationSync onChange={syncSelection} />
      </Suspense>
      {children}
      <SessionDetailsStage
        session={selectedSession}
        open={drawerOpen}
        onClose={closeSession}
        onSessionUpdated={sessionUpdated}
      />
    </SessionDetailsContext.Provider>
  );
}

function SessionDetailsLocationSync({
  onChange,
}: {
  onChange: (pathname: string, sessionId: string | null) => Promise<void>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get(SESSION_QUERY_KEY);
  useEffect(() => {
    const sync = window.setTimeout(() => void onChange(pathname, sessionId), 0);
    return () => window.clearTimeout(sync);
  }, [onChange, pathname, sessionId]);
  return null;
}

function SessionDetailsStage({
  session,
  open,
  onClose,
  onSessionUpdated,
}: {
  session: SessionDetailItem | null;
  open: boolean;
  onClose: () => void;
  onSessionUpdated: (session: SessionDetailItem) => void;
}) {
  const presence = usePresence(open, "content");
  if (!presence.isPresent || !session) return null;

  return (
    <SessionDetailsDrawer
      session={session}
      open={open}
      presenceState={presence.presenceState}
      exiting={presence.isExiting}
      onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
      onClose={onClose}
      onSessionUpdated={onSessionUpdated}
    >
      {session.domain.slug === "entrepreneurship" && (
        <BusinessSessionDetails session={session} />
      )}
      {session.domain.slug === "finance" && (
        <FinanceSessionDetails session={session} />
      )}
      {session.domain.slug === "engineering" && (
        <EngineeringSessionDetails session={session} />
      )}
    </SessionDetailsDrawer>
  );
}
