import { DateTime } from "luxon";
import { directionChangeView } from "@/features/direction/mappers/direction-history.mapper";
import { Prisma } from "@/generated/prisma/client";
import {
  criterionRelations,
  criterionScopes,
} from "@/features/direction/mappers/criterion-scope.mapper";
import { formatMoney } from "@/lib/money/utils/money.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  dateLabel,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import {
  criterionDraft,
  evaluateDirection,
} from "@/features/direction/measurements/services/criterion-evaluation.service";
import type {
  Evaluation,
  GoalView,
  ExperimentView,
  PageResult,
  OwnedOption,
} from "@/features/direction/types/direction.types";
export async function getGoalView(
  userId: string,
  id: string,
  tx: DirectionTx = prisma,
): Promise<GoalView | null> {
  const goal = await tx.goal.findFirst({
    where: { id, userId },
    include: {
      domains: { include: { domain: true } },
      seasons: {
        include: { season: { select: { year: true, quarter: true } } },
      },
      criteria: { orderBy: { position: "asc" }, include: criterionRelations },
      changes: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 },
    },
  });
  if (!goal) return null;
  const criteria = goal.criteria.map(criterionDraft),
    startOn = dateLabel(goal.startOn)!,
    targetOn = dateLabel(goal.targetOn);
  const evaluation = await evaluateDirection(
    tx,
    userId,
    criteria,
    { startOn, targetOn },
    goal.criterionMode as "ALL" | "ANY",
  );
  const conclusionSnapshot =
    goal.conclusionSnapshot as unknown as Evaluation | null;
  return {
    criterionScopes: criterionScopes(goal.criteria),
    id: goal.id,
    version: goal.version,
    title: goal.title,
    description: goal.description,
    startOn,
    targetOn,
    status: goal.status as GoalView["status"],
    outcome: goal.outcome as GoalView["outcome"],
    archivedAt: goal.archivedAt?.toISOString() ?? null,
    concludedAt: goal.concludedAt?.toISOString() ?? null,
    conclusion: goal.conclusion,
    domainIds: goal.domains.map((d) => d.domainId),
    domains: goal.domains.map((d) => ({ id: d.domainId, name: d.domain.name })),
    seasons: goal.seasons.map((s) => ({
      year: s.season.year,
      quarter: s.season.quarter,
      role: s.role as "PRIMARY" | "SUPPORTING",
      href: `/direction/seasons/${s.season.year}/${s.season.quarter}`,
    })),
    criteria,
    criterionMode: goal.criterionMode as "ALL" | "ANY",
    evaluation,
    progressSummary: evaluation.progressSummary,
    conclusionSnapshot,
    liveChangedSinceConclusion: Boolean(
      conclusionSnapshot &&
      conclusionSnapshot.fingerprint !== evaluation.fingerprint,
    ),
    historyNextCursor: goal.changes.length > 20 ? goal.changes[19].id : null,
    history: goal.changes.slice(0, 20).map(directionChangeView),
  };
}
export type DirectionListOptions = {
  search?: string;
  status?: string;
  archived?: boolean;
  cursor?: string;
};
export async function getGoalList(
  userId: string,
  options: DirectionListOptions = {},
): Promise<PageResult<GoalView>> {
  const rows = await prisma.goal.findMany({
    where: {
      userId,
      archivedAt: options.archived ? { not: null } : null,
      ...(options.search
        ? {
            title: {
              contains: options.search.slice(0, 200),
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(["ACTIVE", "PAUSED", "CONCLUDED"].includes(options.status ?? "")
        ? { status: options.status }
        : {}),
      ...(options.cursor ? { id: { gt: options.cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: 26,
    select: { id: true },
  });
  const items: GoalView[] = [];
  for (const row of rows.slice(0, 25)) {
    const view = await getGoalView(userId, row.id);
    if (view) items.push(view);
  }
  return { items, nextCursor: rows.length > 25 ? rows[24].id : null };
}
export async function getExperimentView(
  userId: string,
  id: string,
  tx: DirectionTx = prisma,
): Promise<ExperimentView | null> {
  const row = await tx.experiment.findFirst({
    where: { id, userId },
    include: {
      contentSources: true,
      domains: { include: { domain: true } },
      goal: { select: { id: true, title: true } },
      repeatedFrom: { select: { id: true, title: true } },
      sources: {
        include: {
          interaction: {
            include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
          },
        },
      },
      criteria: { orderBy: { position: "asc" }, include: criterionRelations },
      changes: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 },
    },
  });
  if (!row) return null;
  const criteria = row.criteria.map(criterionDraft),
    startOn = dateLabel(row.startOn)!,
    targetOn = dateLabel(row.targetOn),
    sourceInteractionIds = row.sources.map((s) => s.interactionId);
  const evaluation = await evaluateDirection(
    tx,
    userId,
    criteria,
    { startOn, targetOn },
    row.criterionMode as "ALL" | "ANY",
    new Date(),
    sourceInteractionIds,
    row.contentSources.map((s) => s.contentId),
  );
  const conclusionSnapshot =
    row.conclusionSnapshot as unknown as Evaluation | null;
  return {
    criterionScopes: criterionScopes(row.criteria),
    id: row.id,
    version: row.version,
    title: row.title,
    question: row.question,
    approach: row.approach,
    startOn,
    targetOn,
    stoppingCondition: row.stoppingCondition,
    expectedEvidence: row.expectedEvidence,
    goalId: row.goalId ?? undefined,
    repeatedFromId: row.repeatedFromId ?? undefined,
    criterionMode: row.criterionMode as "ALL" | "ANY",
    status: row.status as ExperimentView["status"],
    outcome: row.outcome as ExperimentView["outcome"],
    result: row.result,
    learning: row.learning,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    concludedAt: row.concludedAt?.toISOString() ?? null,
    domainIds: row.domains.map((d) => d.domainId),
    domains: row.domains.map((d) => ({ id: d.domainId, name: d.domain.name })),
    goal: row.goal ? { id: row.goal.id, name: row.goal.title } : null,
    previousAttempt: row.repeatedFrom
      ? { id: row.repeatedFrom.id, name: row.repeatedFrom.title }
      : null,
    criteria,
    sourceInteractionIds,
    sourceContentIds: row.contentSources.map((s) => s.contentId),
    sources: row.sources.map((s) => ({
      id: s.interactionId,
      label: s.interaction.revisions[0]?.summary ?? "Source unavailable",
      href: `/entrepreneurship/interactions/${s.interactionId}`,
      occurredAt: s.interaction.revisions[0]?.occurredAt.toISOString() ?? null,
      value: null,
      note: s.interaction.voidedAt
        ? "Withdrawn; excluded from live qualification"
        : null,
      state: s.interaction.voidedAt ? "EXCLUDED" : "QUALIFYING",
    })),
    evaluation,
    conclusionSnapshot,
    liveChangedSinceConclusion: Boolean(
      conclusionSnapshot &&
      conclusionSnapshot.fingerprint !== evaluation.fingerprint,
    ),
    historyNextCursor: row.changes.length > 20 ? row.changes[19].id : null,
    history: row.changes.slice(0, 20).map(directionChangeView),
  };
}
export async function getExperimentList(
  userId: string,
  options: DirectionListOptions = {},
): Promise<PageResult<ExperimentView>> {
  const rows = await prisma.experiment.findMany({
    where: {
      userId,
      archivedAt: options.archived ? { not: null } : null,
      ...(options.search
        ? {
            title: {
              contains: options.search.slice(0, 200),
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(["ACTIVE", "PAUSED", "CONCLUDED"].includes(options.status ?? "")
        ? { status: options.status }
        : {}),
      ...(options.cursor ? { id: { gt: options.cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: 26,
    select: { id: true },
  });
  const items: ExperimentView[] = [];
  for (const row of rows.slice(0, 25)) {
    const view = await getExperimentView(userId, row.id);
    if (view) items.push(view);
  }
  return { items, nextCursor: rows.length > 25 ? rows[24].id : null };
}
export async function getDirectionOptions(
  userId: string,
  kind: string,
  search = "",
  cursor?: string,
  scope: { companyId?: string; domainId?: string } = {},
): Promise<PageResult<OwnedOption>> {
  const common = { userId, ...(cursor ? { id: { gt: cursor } } : {}) };
  const name = { contains: search.slice(0, 200), mode: "insensitive" as const };
  const options = { take: 26, orderBy: { id: "asc" as const } };
  let rows: OwnedOption[] = [];
  if (kind === "content")
    rows = (
      await prisma.content.findMany({
        where: { ...common, archivedAt: null, title: name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.title }));
  else if (kind === "channel")
    rows = (
      await prisma.channel.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({
      id: r.id,
      name: r.name,
      description: `${r.platform} · ${r.account}`,
    }));
  else if (kind === "publication")
    rows = (
      await prisma.publication.findMany({
        where: { ...common, withdrawnAt: null, publishedTitle: name },
        ...options,
      })
    ).map((r) => ({
      id: r.id,
      name: r.publishedTitle,
      description: dateLabel(r.publishedOn),
    }));
  else if (kind === "contentObservation") {
    const pattern = `%${search.slice(0, 200)}%`;
    const observations = await prisma.$queryRaw<
      { id: string; publishedTitle: string; observedAt: Date }[]
    >(
      Prisma.sql`SELECT o.id,p."publishedTitle",o."observedAt" FROM content_performance_observation o JOIN content_publication p ON p.id=o."publicationId" AND p."userId"=o."userId" WHERE o."userId"=${userId} AND p."withdrawnAt" IS NULL AND o."observedAt">=COALESCE(p."publishedAt",(p."publishedOn"::timestamp AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'UTC') AND NOT EXISTS(SELECT 1 FROM content_performance_observation newer WHERE newer."supersedesId"=o.id) AND (o.note ILIKE ${pattern} OR p."publishedTitle" ILIKE ${pattern}) ${cursor ? Prisma.sql`AND o.id>${cursor}` : Prisma.empty} ORDER BY o.id ASC LIMIT 26`,
    );
    rows = observations.map((r) => ({
      id: r.id,
      name: r.publishedTitle,
      description: `Manual · ${DateTime.fromJSDate(r.observedAt).setZone("Europe/Amsterdam").toFormat("d LLL yyyy, HH:mm")} Amsterdam`,
    }));
  } else if (kind === "season") {
    const pattern = `%${search.slice(0, 200)}%`;
    const seasons = await prisma.$queryRaw<
      { id: string; year: number; quarter: number }[]
    >(
      Prisma.sql`SELECT id,year,quarter FROM user_season WHERE "userId"=${userId} AND (year::text||' · Q'||quarter::text) ILIKE ${pattern} ${cursor ? Prisma.sql`AND id>${cursor}` : Prisma.empty} ORDER BY id ASC LIMIT 26`,
    );
    rows = seasons.map((r) => ({
      id: r.id,
      name: `${r.year} · Q${r.quarter}`,
    }));
  } else if (kind === "decision")
    rows = (
      await prisma.decision.findMany({
        where: { ...common, choice: name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.choice }));
  else if (kind === "domain")
    rows = (
      await prisma.domain.findMany({
        where: { ...common, enabled: true, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name }));
  else if (kind === "goal")
    rows = (
      await prisma.goal.findMany({
        where: { ...common, archivedAt: null, title: name },
        ...options,
      })
    ).map((r) => ({
      id: r.id,
      name: r.title,
      description: `${dateLabel(r.startOn)}${r.targetOn ? ` → ${dateLabel(r.targetOn)}` : " · open horizon"}`,
    }));
  else if (kind === "experiment" || kind === "concludedExperiment")
    rows = (
      await prisma.experiment.findMany({
        where: {
          ...common,
          archivedAt: null,
          title: name,
          ...(kind === "concludedExperiment" ? { status: "CONCLUDED" } : {}),
        },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.title }));
  else if (kind === "workSource")
    rows = (
      await prisma.workSource.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name }));
  else if (kind === "company")
    rows = (
      await prisma.company.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name }));
  else if (kind === "niche")
    rows = (
      await prisma.niche.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name }));
  else if (kind === "project")
    rows = (
      await prisma.engineeringProject.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name }));
  else if (kind === "savingsGoal")
    rows = (
      await prisma.savingsGoal.findMany({
        where: { ...common, archivedAt: null, name },
        ...options,
      })
    ).map((r) => ({ id: r.id, name: r.name, description: r.currency }));
  else if (kind === "activity")
    rows = (
      await prisma.activityType.findMany({
        where: {
          ...(cursor ? { id: { gt: cursor } } : {}),
          name,
          domain: { userId },
          ...(scope.domainId ? { domainId: scope.domainId } : {}),
          enabled: true,
        },
        ...options,
        include: { domain: { select: { name: true } } },
      })
    ).map((r) => ({ id: r.id, name: r.name, description: r.domain.name }));
  else if (kind === "interaction" || kind === "outreach") {
    const pattern = `%${search.slice(0, 200).replace(/[\\%_]/g, "\\$&")}%`;
    const records = await prisma.$queryRaw<
      {
        id: string;
        summary: string;
        companySnapshot: string | null;
        occurredAt: Date;
      }[]
    >(
      Prisma.sql`SELECT i.id,r.summary,r."companySnapshot",r."occurredAt" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r.summary ILIKE ${pattern} ${kind === "outreach" ? Prisma.sql`AND r.kind='OUTREACH_SENT'` : Prisma.empty} ${cursor ? Prisma.sql`AND i.id>${cursor}` : Prisma.empty} ORDER BY i.id ASC LIMIT 26`,
    );
    rows = records.map((r) => ({
      id: r.id,
      name: r.summary,
      description: `${r.companySnapshot ?? "No company"} · ${dateLabel(r.occurredAt)}`,
    }));
  } else if (kind === "session")
    rows = (
      await prisma.session.findMany({
        where: {
          ...common,
          endedAt: { not: null },
          ...(search ? { description: name } : {}),
        },
        ...options,
        include: { domain: { select: { name: true } } },
      })
    ).map((r) => ({
      id: r.id,
      name: r.description || "Completed session",
      description: `${r.domain.name} · ${dateLabel(r.startedAt)}`,
    }));
  else if (kind === "engineeringEvidence")
    rows = (
      await prisma.engineeringEvidence.findMany({
        where: { ...common, title: name },
        ...options,
      })
    ).map((r) => ({
      id: r.id,
      name: r.title,
      description: `${r.type} · ${dateLabel(r.occurredAt)}`,
    }));
  else if (kind === "transaction")
    rows = (
      await prisma.financialTransaction.findMany({
        where: {
          ...common,
          ...(search
            ? {
                OR: [
                  { notes: name },
                  { workSource: { name } },
                  { counterparty: { name } },
                ],
              }
            : {}),
        },
        ...options,
        include: {
          workSource: { select: { name: true } },
          counterparty: { select: { name: true } },
        },
      })
    ).map((r) => ({
      id: r.id,
      name:
        r.notes ||
        r.workSource?.name ||
        r.counterparty?.name ||
        "Recorded transaction",
      description: `${formatMoney(r.amountMinor, r.currency)} · ${dateLabel(r.occurredAt)}`,
    }));
  else if (kind === "offerRevision")
    rows = (
      await prisma.offerRevision.findMany({
        where: {
          ...common,
          title: name,
          proposedAt: { not: null },
          ...(scope.companyId ? { companyId: scope.companyId } : {}),
        },
        ...options,
      })
    ).map((r) => ({
      id: r.id,
      name: `${r.companySnapshot} · ${r.title}`,
      description: `Revision ${r.version}`,
    }));
  return {
    items: rows.slice(0, 25),
    nextCursor: rows.length > 25 ? rows[24].id : null,
  };
}
