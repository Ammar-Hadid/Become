import { NextResponse } from "next/server";
import { startSessionSchema } from "@/features/sessions/session.schema";
import { startSession } from "@/features/sessions/start-session.service";
import { getCurrentUser } from "@/lib/auth/current-user.query";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = startSessionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid domain and activity." },
      { status: 400 },
    );
  }

  const result = await startSession(user.id, parsed.data);
  if (result.status === "activity-not-found") {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }
  if (result.status === "already-active") {
    return NextResponse.json(
      { error: "A timer is already running." },
      { status: 409 },
    );
  }

  return NextResponse.json({ id: result.sessionId }, { status: 201 });
}
