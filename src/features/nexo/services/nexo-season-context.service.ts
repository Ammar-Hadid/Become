import "server-only";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getDashboardRollingWeekData } from "@/features/dashboard/analytics/queries/dashboard.query";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { calculateLivingSeasonFacts } from "@/features/seasons/living/utils/living-season-progress.util";

export type NexoSeasonArea = "dashboard" | "engineering" | "finance" | "entrepreneurship" | "content";

/** Bounded, user-scoped facts shared by Nexo and C.O.T.S. Arithmetic stays in domain services. */
export async function getNexoSeasonContext(userId: string, area: NexoSeasonArea) {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const season = await getSeasonView(userId);
  if (!season.id) return null;
  const dashboard = await getDashboardRollingWeekData(userId, now);
  const progress = calculateLivingSeasonFacts(season.calendar, season.goals.map(({ goal }) => goal), now.toISODate()!);
  const domain = dashboard.domains.find((item) => item.slug === area);
  const selectedGoals = season.goals
    .filter(({ goal }) => area === "dashboard" || Boolean(domain && goal.domainIds.includes(domain.id)))
    .slice(0, 8);
  const largestGap = progress.goals
    .filter((goal) => goal.gapPoints !== null)
    .sort((left, right) => left.gapPoints! - right.gapPoints!)[0];
  const facts = [
    { id: "season-day", text: `Day ${progress.dayNumber} of ${progress.totalDays}; ${season.calendar.daysAfterToday} days remain.` },
    { id: "season-state", text: `Season state is ${progress.state}. ${progress.actualPercent === null ? "Measured goal pace is unavailable." : `Recorded goal progress ${Math.round(progress.actualPercent)}%; planned pace ${Math.round(progress.expectedPercent!)}%.`}` },
    { id: "recent-focus", text: `Recorded focused time in the past seven days: ${Math.round((area === "dashboard" ? dashboard.totalSeconds : domain?.seconds ?? 0) / 60)} minutes${area === "dashboard" ? " across Become" : ` in ${area}`}. Recorded time alone is not proof of goal progress.` },
    ...selectedGoals.map(({ goal }) => {
      const measured = progress.goals.find((item) => item.id === goal.id);
      return { id: `goal-${goal.id}`, text: `${goal.title.slice(0, 120)}: ${measured?.gapPoints === null || measured?.gapPoints === undefined ? "pace unassessed" : `${Math.round(measured.actualPercent!)}% recorded, ${Math.round(measured.expectedPercent!)}% planned`}.` };
    }),
  ];
  if (largestGap?.gapPoints !== null && largestGap?.gapPoints !== undefined && largestGap.gapPoints < 0)
    facts.push({ id: "largest-gap", text: `Largest measured goal deficit: ${largestGap.title.slice(0, 120)}, ${Math.abs(Math.round(largestGap.gapPoints))} percentage points below its planned pace.` });
  return {
    seasonId: season.id,
    characterIdentityId: season.cotsIdentity?.id ?? null,
    date: now.toISODate()!,
    area,
    progress,
    facts,
  };
}
