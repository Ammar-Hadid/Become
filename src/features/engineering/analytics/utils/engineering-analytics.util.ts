import { DateTime } from "luxon";
import {
  ENGINEERING_CONTEXT_OPTIONS,
  ENGINEERING_EVIDENCE_TYPE_OPTIONS,
  getEngineeringContextLabel,
} from "@/features/engineering/constants/engineering.constants";
import type {
  EngineeringAnalyticsData,
  EngineeringContextValue,
  EngineeringEvidenceTypeValue,
} from "@/features/engineering/types/engineering.types";
import {
  calculateSessionDurationWithinPeriod,
  countActiveDaysWithinPeriod,
  getPeriod,
  getPeriodBuckets,
  getPreviousPeriod,
  percentageChange,
  type Timeframe,
} from "@/lib/dates/utils/period.util";

export type EngineeringSessionFact = {
  startedAt: Date;
  endedAt: Date | null;
  engineeringContext: EngineeringContextValue | null;
  activityType: { id: string; name: string };
  engineeringProject: {
    id: string;
    name: string;
    context: EngineeringContextValue;
    technologies: Array<{ technology: { id: string; name: string } }>;
  } | null;
};

export type EngineeringEvidenceFact = {
  type: EngineeringEvidenceTypeValue;
  occurredAt: Date;
};

export function buildEngineeringAnalytics(
  sessions: EngineeringSessionFact[],
  evidence: EngineeringEvidenceFact[],
  timeframe: Timeframe,
  now: DateTime,
): EngineeringAnalyticsData {
  const period = getPeriod(now, timeframe);
  const previousPeriod = getPreviousPeriod(period);
  const totalFor = (candidatePeriod: typeof period) =>
    sessions.reduce(
      (total, session) =>
        total +
        calculateSessionDurationWithinPeriod(session, candidatePeriod, now),
      0,
    );
  const totalSeconds = totalFor(period);
  const previousTotalSeconds = totalFor(previousPeriod);

  return {
    timeframe,
    periodLabel: period.label,
    totalSeconds,
    previousTotalSeconds,
    comparisonPercent: percentageChange(totalSeconds, previousTotalSeconds),
    activeDays: countActiveDaysWithinPeriod(sessions, period, now),
    chart: getPeriodBuckets(period).map((bucket) => ({
      label: bucket.label,
      seconds: sessions.reduce(
        (total, session) =>
          total + calculateSessionDurationWithinPeriod(session, bucket, now),
        0,
      ),
    })),
    projects: buildBreakdown(sessions, period, now, (session) => ({
      id: session.engineeringProject?.id ?? "unassigned",
      label: session.engineeringProject?.name ?? "No project",
    })),
    activities: buildBreakdown(sessions, period, now, (session) => ({
      id: session.activityType.id,
      label: session.activityType.name,
    })),
    contexts: buildContextBreakdown(sessions, period, now),
    workedProjectContexts: buildWorkedProjectContextBreakdown(
      sessions,
      period,
      now,
    ),
    technologies: buildTechnologyBreakdown(sessions, period, now),
    evidence: ENGINEERING_EVIDENCE_TYPE_OPTIONS.map((option) => ({
      type: option.value,
      label: option.label,
      count: countEvidence(evidence, option.value, period.start, period.end),
      previousCount: countEvidence(
        evidence,
        option.value,
        previousPeriod.start,
        previousPeriod.end,
      ),
    })),
  };
}

function buildWorkedProjectContextBreakdown(
  sessions: EngineeringSessionFact[],
  period: ReturnType<typeof getPeriod>,
  now: DateTime,
) {
  const projectIdsByContext = new Map<EngineeringContextValue, Set<string>>(
    ENGINEERING_CONTEXT_OPTIONS.map((option) => [option.value, new Set()]),
  );

  for (const session of sessions) {
    if (
      !session.engineeringProject ||
      !calculateSessionDurationWithinPeriod(session, period, now)
    ) {
      continue;
    }
    projectIdsByContext
      .get(session.engineeringProject.context)
      ?.add(session.engineeringProject.id);
  }

  return ENGINEERING_CONTEXT_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    projectCount: projectIdsByContext.get(option.value)?.size ?? 0,
  }));
}

function buildTechnologyBreakdown(
  sessions: EngineeringSessionFact[],
  period: ReturnType<typeof getPeriod>,
  now: DateTime,
) {
  const totals = new Map<
    string,
    { id: string; label: string; seconds: number }
  >();
  for (const session of sessions) {
    const seconds = calculateSessionDurationWithinPeriod(session, period, now);
    if (!seconds || !session.engineeringProject) continue;
    for (const { technology } of session.engineeringProject.technologies) {
      const existing = totals.get(technology.id);
      totals.set(technology.id, {
        id: technology.id,
        label: technology.name,
        seconds: (existing?.seconds ?? 0) + seconds,
      });
    }
  }
  return [...totals.values()].sort((left, right) =>
    right.seconds === left.seconds
      ? left.label.localeCompare(right.label)
      : right.seconds - left.seconds,
  );
}

function buildBreakdown(
  sessions: EngineeringSessionFact[],
  period: ReturnType<typeof getPeriod>,
  now: DateTime,
  identify: (session: EngineeringSessionFact) => { id: string; label: string },
) {
  const totals = new Map<
    string,
    { id: string; label: string; seconds: number }
  >();
  for (const session of sessions) {
    const seconds = calculateSessionDurationWithinPeriod(session, period, now);
    if (!seconds) continue;
    const item = identify(session);
    const existing = totals.get(item.id);
    totals.set(item.id, {
      ...item,
      seconds: (existing?.seconds ?? 0) + seconds,
    });
  }
  return [...totals.values()].sort((a, b) => b.seconds - a.seconds);
}

function buildContextBreakdown(
  sessions: EngineeringSessionFact[],
  period: ReturnType<typeof getPeriod>,
  now: DateTime,
) {
  const breakdown = buildBreakdown(sessions, period, now, (session) => ({
    id: session.engineeringContext ?? "unassigned",
    label: getEngineeringContextLabel(session.engineeringContext),
  }));
  const totals = new Map(breakdown.map((item) => [item.id, item]));
  return [
    ...ENGINEERING_CONTEXT_OPTIONS.map(
      (option) =>
        totals.get(option.value) ?? {
          id: option.value,
          label: option.label,
          seconds: 0,
        },
    ),
    ...(totals.has("unassigned") ? [totals.get("unassigned")!] : []),
  ];
}

function countEvidence(
  evidence: EngineeringEvidenceFact[],
  type: EngineeringEvidenceTypeValue,
  start: DateTime,
  end: DateTime,
) {
  const startMs = start.toUTC().toMillis();
  const endMs = end.toUTC().toMillis();
  return evidence.filter((item) => {
    const occurredAt = item.occurredAt.getTime();
    return item.type === type && occurredAt >= startMs && occurredAt < endMs;
  }).length;
}
