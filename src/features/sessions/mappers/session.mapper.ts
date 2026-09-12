import { DateTime } from "luxon";
import type {
  SessionDetailItem,
  SessionDetailWithRelations,
  SessionListItem,
  SessionWithRelations,
} from "@/features/sessions/types/session.types";

export function toSessionListItem(
  session: SessionWithRelations,
  now = DateTime.utc(),
): SessionListItem {
  const end = session.endedAt ? DateTime.fromJSDate(session.endedAt) : now;
  const start = DateTime.fromJSDate(session.startedAt);

  return {
    id: session.id,
    contentId: session.contentId,
    contentVariantId: session.contentVariantId,
    contentTitleSnapshot: session.contentTitleSnapshot,
    contentVariantSnapshot: session.contentVariantSnapshot,
    contentActivitySnapshot: session.contentActivitySnapshot,
    businessCompanyId: session.businessCompanyId,
    businessNicheId: session.businessNicheId,
    businessCompanySnapshot: session.businessCompanySnapshot,
    businessNicheSnapshot: session.businessNicheSnapshot,
    entrepreneurshipActivityKind: session.entrepreneurshipActivityKind,
    financeActivityKind: session.financeActivityKind,
    financeCompensationType: session.financeCompensationType,
    workSourceId: session.workSourceId,
    incomeOpportunityId: session.incomeOpportunityId,
    paymentAttributionCompleteAt:
      session.paymentAttributionCompleteAt?.toISOString() ?? null,
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
    engineeringContext: session.engineeringContext,
    engineeringProject: session.engineeringProject
      ? {
          id: session.engineeringProject.id,
          name: session.engineeringProject.name,
        }
      : null,
  };
}

export function toSessionDetailItem(
  session: SessionDetailWithRelations,
  now = DateTime.utc(),
): SessionDetailItem {
  return {
    ...toSessionListItem(session, now),
    engineeringEvidence: session.engineeringEvidence.map((evidence) => ({
      id: evidence.id,
      type: evidence.type,
      title: evidence.title,
      details: evidence.details,
      occurredAt: evidence.occurredAt.toISOString(),
    })),
  };
}
