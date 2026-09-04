import type { Metadata } from "next";
import { DateTime } from "luxon";
import { EngineeringOverview } from "@/features/engineering/analytics/components/engineering-overview.component";
import { getEngineeringAnalyticsData } from "@/features/engineering/analytics/queries/engineering-analytics.query";
import {
  getEngineeringEvidenceList,
  getEngineeringProjects,
} from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { isTimeframe } from "@/lib/dates/utils/period.util";

export const metadata: Metadata = { title: "Engineering" };

export default async function EngineeringPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const value = (await searchParams).timeframe ?? null;
  const timeframe = isTimeframe(value) ? value : "week";
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const [analytics, projects, recentEvidence] = await Promise.all([
    getEngineeringAnalyticsData(user.id, timeframe, now),
    getEngineeringProjects(user.id, "open"),
    getEngineeringEvidenceList(user.id, 5),
  ]);

  return (
    <EngineeringOverview
      analytics={analytics}
      projects={projects}
      recentEvidence={recentEvidence}
    />
  );
}
