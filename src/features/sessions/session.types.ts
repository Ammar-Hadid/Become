import type { Prisma } from "@/generated/prisma/client";

export type ActivityOption = { id: string; name: string; slug: string };

export type DomainOption = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  analyticsColor: string | null;
  activityTypes: ActivityOption[];
};

export type SessionListItem = {
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
};

export type ActiveSessionData = SessionListItem;

export type ActiveTimerState = {
  activeSession: ActiveSessionData | null;
  elapsedSeconds: number;
};

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: { domain: true; activityType: true };
}>;
