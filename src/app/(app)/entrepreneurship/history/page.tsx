import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { isTimeframe } from "@/lib/dates/utils/period.util";
import { BusinessOverview } from "@/features/entrepreneurship/analytics/components/business-overview.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string; date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const query = await searchParams;
  return (
    <BusinessOverview
      userId={user.id}
      timeframe={
        isTimeframe(query.timeframe ?? null)
          ? (query.timeframe as "week" | "month" | "season" | "year")
          : "week"
      }
      date={query.date}
    />
  );
}
