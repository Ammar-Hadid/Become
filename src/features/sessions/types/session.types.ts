import type { Prisma } from "@/generated/prisma/client";
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

export type ActiveTimerState = {
  activeSession: ActiveSessionData | null;
  elapsedSeconds: number;
  completedSessions: Readonly<Record<string, SessionDetailItem>>;
  confirmCompletion: (session: SessionDetailItem) => void;
};

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: { domain: true; activityType: true; engineeringProject: true };
}>;

export type SessionDetailWithRelations = Prisma.SessionGetPayload<{
  include: {
    domain: true;
    activityType: true;
    engineeringProject: true;
    engineeringEvidence: true;
  };
}>;
