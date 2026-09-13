import type { ActiveSessionData } from "@/features/sessions/types/session.types";

export type TimerOperation = "start" | "pause" | "resume" | "complete";

export type TimerMutationResult<Session = ActiveSessionData> = {
  ok: boolean;
  error?: string;
  session?: Session;
  sessionId?: string;
  evidenceId?: string | null;
};
