import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getTimerSnapshot } from "@/features/sessions/timer/queries/timer-snapshot.query";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getTimerSnapshot(user.id), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
