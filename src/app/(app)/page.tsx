import { getBusinessAttention } from "@/features/entrepreneurship/analytics/queries/business-overview.query";
import { DateTime } from "luxon";
import { Dashboard } from "@/features/dashboard/components/dashboard.component";
import { getDashboardData } from "@/features/dashboard/analytics/queries/dashboard.query";
import { getRecentSessions } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const now = DateTime.now().setZone(APP_TIMEZONE);
  if (!now.isValid)
    throw new Error(`Invalid application timezone: ${APP_TIMEZONE}`);
  const season = getSeasonForDate(now);
  const [dashboard, recentSessions, businessAttention] = await Promise.all([
    getDashboardData(user.id, "week", now),
    getRecentSessions(user.id, 8),
    getBusinessAttention(user.id),
  ]);
  const seasonProgress =
    (now.diff(season.start, "seconds").seconds /
      season.end.diff(season.start, "seconds").seconds) *
    100;

  return (
    <Dashboard
      userName={user.name}
      season={season.label}
      weekNumber={now.weekNumber}
      seasonProgress={Math.min(100, Math.max(0, seasonProgress))}
      initialData={dashboard}
      recentSessions={recentSessions}
      businessAttention={businessAttention}
    />
  );
}
