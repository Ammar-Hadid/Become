import { getBusinessAttention } from "@/features/entrepreneurship/analytics/queries/business-overview.query";
import { getFinanceAttention } from "@/features/finance/analytics/queries/finance-attention.query";
import { DateTime } from "luxon";
import { Dashboard } from "@/features/dashboard/components/dashboard.component";
import type { DashboardAttentionItem } from "@/features/dashboard/attention/types/dashboard-attention.types";
import { getDashboardRollingWeekData } from "@/features/dashboard/analytics/queries/dashboard.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { getSeasonTransition } from "@/features/seasons/transition/queries/season-transition.query";
import { calculateLivingSeasonFacts } from "@/features/seasons/living/utils/living-season-progress.util";
import { getLivingSeasonScene } from "@/features/seasons/living/queries/living-season.query";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const now = DateTime.now().setZone(APP_TIMEZONE);
  if (!now.isValid)
    throw new Error(`Invalid application timezone: ${APP_TIMEZONE}`);
  const season = getSeasonForDate(now);
  const [
    dashboard,
    businessAttention,
    financeAttention,
    seasonDirection,
    transition,
  ] = await Promise.all([
    getDashboardRollingWeekData(user.id, now),
    getBusinessAttention(user.id),
    getFinanceAttention(user.id),
    getSeasonView(user.id),
    getSeasonTransition(user.id).catch((error: unknown) => {
      console.error(
        "Season transition unavailable; Home remains accessible",
        error,
      );
      return null;
    }),
  ]);
  const seasonProgress =
    (now.diff(season.start, "seconds").seconds /
      season.end.diff(season.start, "seconds").seconds) *
    100;
  const livingFacts = calculateLivingSeasonFacts(
    seasonDirection.calendar,
    seasonDirection.goals.map(({ goal }) => goal),
    now.toISODate()!,
  );
  const livingScene = seasonDirection.id
    ? await getLivingSeasonScene(user.id, seasonDirection.id, livingFacts)
    : null;
  const attention: DashboardAttentionItem[] = [
    ...financeAttention.map((item) => ({ id: item.id, text: item.text, href: item.href, area: "finance" as const })),
    ...businessAttention.map((item) => ({ ...item, area: "entrepreneurship" as const })),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href && candidate.text === item.text) === index);
  const previewEmptyAttention =
    process.env.NODE_ENV === "development" &&
    user.email === "demotest@gmail.com" &&
    (await searchParams).preview === "attention-empty";

  return (
    <Dashboard
      userName={user.name}
      currentWeekday={now.weekday}
      seasonProgress={Math.min(100, Math.max(0, seasonProgress))}
      livingFacts={livingFacts}
      livingScene={livingScene}
      initialData={dashboard}
      attention={previewEmptyAttention ? [] : attention}
      seasonDirection={seasonDirection}
      transition={transition}
      transitionUnavailable={transition === null}
      seasonRecoveryScope={`${user.id}:${season.year}:${season.season}`}
    />
  );
}
