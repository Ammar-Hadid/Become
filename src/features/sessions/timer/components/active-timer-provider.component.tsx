"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  ActiveSessionData,
  ActiveTimerState,
  SessionDetailItem,
  TimerSnapshot,
} from "@/features/sessions/types/session.types";
import type {
  CompleteSessionInput,
  StartSessionInput,
} from "@/features/sessions/schemas/session.schema";
import type {
  TimerMutationResult,
  TimerOperation,
} from "@/features/sessions/timer/types/timer-mutation.types";
import { calculateFocusedSeconds } from "@/features/sessions/timer/utils/elapsed-time.util";
import {
  isTimerSnapshot,
  selectNewerTimerSnapshot,
} from "@/features/sessions/timer/utils/timer-snapshot.util";

export const ActiveTimerContext = createContext<ActiveTimerState | null>(null);

export function ActiveTimerProvider({
  timerSnapshot: serverSnapshot,
  children,
}: {
  timerSnapshot: TimerSnapshot;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(serverSnapshot);
  const snapshotRef = useRef(serverSnapshot);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [pendingOperation, setPendingOperation] =
    useState<TimerOperation | null>(null);
  const mutationRef = useRef(false);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const recoveryRef = useRef(false);
  const readSequenceRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [completedSessions, setCompletedSessions] = useState<
    Record<string, SessionDetailItem>
  >({});

  const rememberCompletion = useCallback((session: SessionDetailItem) => {
    setCompletedSessions((completed) =>
      completed[session.id]
        ? completed
        : { ...completed, [session.id]: session },
    );
  }, []);

  const acceptSnapshot = useCallback(
    (incoming: TimerSnapshot) => {
      const current = snapshotRef.current;
      const next = selectNewerTimerSnapshot(current, incoming);
      if (next === current) return false;
      snapshotRef.current = next;
      setSnapshot(next);
      setNowMs(Date.now());
      // Remote completion clears occupation first; resolve its history separately.
      if (
        current.activeSession &&
        current.activeSession.id !== next.activeSession?.id
      ) {
        void fetch(
          `/api/sessions/${encodeURIComponent(current.activeSession.id)}`,
          { cache: "no-store" },
        )
          .then(async (response) => (response.ok ? response.json() : null))
          .then((session: SessionDetailItem | null) => {
            if (session?.endedAt && session.status === "COMPLETED")
              rememberCompletion(session);
          })
          .catch(() => {});
      }
      return true;
    },
    [rememberCompletion],
  );

  useEffect(() => {
    acceptSnapshot(serverSnapshot);
  }, [serverSnapshot, acceptSnapshot]);

  const reconcileTimer = useCallback(async () => {
    const sequence = ++readSequenceRef.current;
    try {
      const response = await fetch("/api/sessions/active", {
        cache: "no-store",
      });
      const incoming: unknown = await response.json();
      if (!response.ok || !isTimerSnapshot(incoming)) return false;
      const changed = acceptSnapshot(incoming);
      if (
        sequence === readSequenceRef.current &&
        incoming.revision >= snapshotRef.current.revision
      ) {
        recoveryRef.current = false;
        setRecoveryRequired(false);
      }
      if (changed) router.refresh();
      return true;
    } catch {
      return false;
    }
  }, [acceptSnapshot, router]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") void reconcileTimer();
    };
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("become:timer-state");
      channel.onmessage = check;
      channelRef.current = channel;
    }
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [reconcileTimer]);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-timer-mutation-pending",
      Boolean(pendingOperation),
    );
    return () =>
      document.documentElement.removeAttribute("data-timer-mutation-pending");
  }, [pendingOperation]);

  const mutate = useCallback(
    async <Session extends ActiveSessionData>(
      operation: TimerOperation,
      url: string,
      input: unknown,
      targetId?: string,
    ): Promise<TimerMutationResult<Session>> => {
      if (mutationRef.current)
        return { ok: false, error: "A timer change is already being saved." };
      if (
        operation === "start" &&
        (snapshotRef.current.activeSession || recoveryRef.current)
      ) {
        return {
          ok: false,
          error: recoveryRef.current
            ? "Check the timer status before starting another session."
            : "End your current session before starting another.",
        };
      }
      mutationRef.current = true;
      setPendingOperation(operation);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = (await response.json()) as TimerMutationResult<Session> & {
          timer?: unknown;
        };
        if (isTimerSnapshot(body.timer)) acceptSnapshot(body.timer);
        if (!response.ok) {
          if (response.status >= 500 && !isTimerSnapshot(body.timer))
            throw new Error("Timer commit could not be confirmed.");
          if (response.status === 409 && !isTimerSnapshot(body.timer))
            await reconcileTimer();
          return {
            ok: false,
            error: body.error ?? "Could not save the timer change.",
          };
        }
        if (
          !isTimerSnapshot(body.timer) ||
          !body.session ||
          (targetId && body.session.id !== targetId)
        )
          throw new Error("Missing canonical timer acknowledgement.");
        if (operation === "complete") {
          const completed = body.session as unknown as SessionDetailItem;
          if (!completed.endedAt || completed.status !== "COMPLETED")
            throw new Error("Missing completed session.");
          rememberCompletion(completed);
        }
        recoveryRef.current = false;
        setRecoveryRequired(false);
        setAnnouncement(
          operation === "pause"
            ? "Session paused. Break time is excluded."
            : operation === "resume"
              ? "Session resumed."
              : operation === "complete"
                ? "Session saved."
                : "Focus session started.",
        );
        channelRef.current?.postMessage("changed");
        router.refresh();
        return { ...body, ok: true };
      } catch {
        recoveryRef.current = true;
        setRecoveryRequired(true);
        const reconciled = await reconcileTimer();
        if (reconciled) channelRef.current?.postMessage("changed");
        const message =
          operation === "complete"
            ? "Could not confirm the save. Please try again; a saved session will not be completed twice."
            : "Could not confirm the timer change. Review its current status and try again.";
        return {
          ok: false,
          error: reconciled
            ? message
            : `${message} Check your connection, then check the timer status.`,
        };
      } finally {
        mutationRef.current = false;
        setPendingOperation(null);
      }
    },
    [acceptSnapshot, reconcileTimer, rememberCompletion, router],
  );

  const startSession = useCallback(
    (input: StartSessionInput) =>
      mutate<ActiveSessionData>("start", "/api/sessions", input),
    [mutate],
  );
  const completeSession = useCallback(
    (id: string, input: CompleteSessionInput) =>
      mutate<SessionDetailItem>(
        "complete",
        `/api/sessions/${encodeURIComponent(id)}/complete`,
        input,
        id,
      ),
    [mutate],
  );
  const changeRunningState = useCallback(
    (operation: "pause" | "resume", id: string) => {
      const current = snapshotRef.current;
      if (!current.activeSession || current.activeSession.id !== id)
        return Promise.resolve({
          ok: false,
          error:
            "This session has changed. Review the current session and try again.",
        });
      return mutate<ActiveSessionData>(
        operation,
        `/api/sessions/${encodeURIComponent(current.activeSession.id)}/${operation}`,
        { expectedRevision: current.revision },
        current.activeSession.id,
      );
    },
    [mutate],
  );
  const pauseSession = useCallback(
    (id: string) => changeRunningState("pause", id),
    [changeRunningState],
  );
  const resumeSession = useCallback(
    (id: string) => changeRunningState("resume", id),
    [changeRunningState],
  );
  const activeSession = snapshot.activeSession;

  useEffect(() => {
    if (activeSession?.status !== "RUNNING") return;
    const update = () => setNowMs(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const value = useMemo<ActiveTimerState>(
    () => ({
      activeSession,
      completedSessions,
      pendingOperation,
      recoveryRequired,
      startSession,
      completeSession,
      pauseSession,
      resumeSession,
      reconcileTimer,
      elapsedSeconds: activeSession
        ? nowMs === null
          ? activeSession.durationSeconds
          : calculateFocusedSeconds(activeSession, nowMs)
        : 0,
    }),
    [
      activeSession,
      completedSessions,
      pendingOperation,
      recoveryRequired,
      startSession,
      completeSession,
      pauseSession,
      resumeSession,
      reconcileTimer,
      nowMs,
    ],
  );

  return (
    <ActiveTimerContext.Provider value={value}>
      {children}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </ActiveTimerContext.Provider>
  );
}
