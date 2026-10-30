import { NextResponse } from "next/server";
import { getDashboardLensData } from "@/features/dashboard/lenses/queries/dashboard-lens.query";
import type { DashboardLensData } from "@/features/dashboard/lenses/types/dashboard-lens.types";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

const areas = new Set<DashboardLensData["area"]>(["engineering", "finance", "entrepreneurship", "content"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const area = new URL(request.url).searchParams.get("area");
  if (!area || !areas.has(area as DashboardLensData["area"]))
    return NextResponse.json({ error: "Unknown dashboard lens" }, { status: 400 });
  const data = await getDashboardLensData(user.id, area as DashboardLensData["area"]);
  return NextResponse.json(data);
}
