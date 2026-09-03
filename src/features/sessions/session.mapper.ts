import { DateTime } from "luxon";
import type {
  SessionListItem,
  SessionWithRelations,
} from "@/features/sessions/session.types";

export function toSessionListItem(
  session: SessionWithRelations,
  now = DateTime.utc(),
): SessionListItem {
  const end = session.endedAt ? DateTime.fromJSDate(session.endedAt) : now;
  const start = DateTime.fromJSDate(session.startedAt);

  return {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    description: session.description,
    outcome: session.outcome,
    notes: session.notes,
    durationSeconds: Math.max(
      0,
      Math.floor(end.diff(start, "seconds").seconds),
    ),
    domain: {
      id: session.domain.id,
      name: session.domain.name,
      slug: session.domain.slug,
      analyticsColor: session.domain.analyticsColor,
    },
    activityType: {
      id: session.activityType.id,
      name: session.activityType.name,
    },
  };
}
