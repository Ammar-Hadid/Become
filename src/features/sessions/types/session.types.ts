import type { Prisma } from "@/generated/prisma/client";
import type {
  CompleteSessionInput,
  StartSessionInput,
} from "@/features/sessions/schemas/session.schema";
import type {
  TimerMutationResult,
  TimerOperation,
} from "@/features/sessions/timer/types/timer-mutation.types";
import type {
  FinanceActivityKind,
  FinanceCompensationType,
} from "@/generated/prisma/enums";

export type ActivityOption = {
  id: string;
  name: string;
  slug: string;
  financeActivityKind?: FinanceActivityKind | null;
};

export type DomainOption = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  analyticsColor: string | null;
  activityTypes: ActivityOption[];
};

export type SessionListItem = {
  status: "RUNNING" | "PAUSED" | "COMPLETED";
  pausedAt: string | null;
  accumulatedActiveMilliseconds: number;
  runningSince: string | null;
  totalPausedMilliseconds: number;
  contentId?: string | null;
  contentVariantId?: string | null;
  contentTitleSnapshot?: string | null;
  contentVariantSnapshot?: string | null;
  contentActivitySnapshot?: string | null;
  businessCompanyId?: string | null;
  businessNicheId?: string | null;
  businessCompanySnapshot?: string | null;
  businessNicheSnapshot?: string | null;
  entrepreneurshipActivityKind?: string | null;
  financeActivityKind?: FinanceActivityKind | null;
  financeCompensationType?: FinanceCompensationType | null;
  workSourceId?: string | null;
  incomeOpportunityId?: string | null;
  paymentAttributionCompleteAt?: string | null;
  id: string;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
  outcome: string | null;
  notes: string | null;
  durationSeconds: number;
  domain: {
    id: string;
    name: string;
    slug: string;
    analyticsColor: string | null;
  };
  activityType: { id: string; name: string };
  engineeringContext: string | null;
  engineeringProject: { id: string; name: string } | null;
};

export type SessionDetailItem = SessionListItem & {
  engineeringEvidence: Array<{
    id: string;
    type: string;
    title: string;
    details: string | null;
    occurredAt: string;
  }>;
};

export type ActiveSessionData = SessionListItem;

export type TimerSnapshot = {
  revision: number;
  activeSession: ActiveSessionData | null;
};

export type ActiveTimerState = {
  activeSession: ActiveSessionData | null;
  elapsedSeconds: number;
  pendingOperation: TimerOperation | null;
  recoveryRequired: boolean;
  completedSessions: Readonly<Record<string, SessionDetailItem>>;
  startSession: (input: StartSessionInput) => Promise<TimerMutationResult>;
  completeSession: (
    id: string,
    input: CompleteSessionInput,
  ) => Promise<TimerMutationResult<SessionDetailItem>>;
  pauseSession: (id: string) => Promise<TimerMutationResult>;
  resumeSession: (id: string) => Promise<TimerMutationResult>;
  reconcileTimer: () => Promise<boolean>;
};

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: {
    domain: true;
    activityType: true;
    engineeringProject: true;
    pauses: true;
  };
}>;

export type SessionDetailWithRelations = Prisma.SessionGetPayload<{
  include: {
    domain: true;
    activityType: true;
    engineeringProject: true;
    engineeringEvidence: true;
    pauses: true;
  };
}>;
