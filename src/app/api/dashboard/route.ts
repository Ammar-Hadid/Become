import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { getDashboardData } from "@/features/dashboard/analytics/queries/dashboard.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { isTimeframe } from "@/lib/dates/utils/period.util";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const value = new URL(request.url).searchParams.get("timeframe");
  const timeframe = isTimeframe(value) ? value : "week";
  const now = DateTime.now().setZone(APP_TIMEZONE);
  if (!now.isValid)
    return NextResponse.json(
      { error: "Invalid application timezone." },
      { status: 500 },
    );
  const dashboard = await getDashboardData(user.id, timeframe, now);
  return NextResponse.json(dashboard);
}
