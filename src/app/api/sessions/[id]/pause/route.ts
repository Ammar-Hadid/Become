import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { transitionSessionSchema } from "@/features/sessions/schemas/session.schema";
import { transitionSession } from "@/features/sessions/lifecycle/services/transition-session.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = transitionSessionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid timer revision." },
      { status: 400 },
    );
  const { id } = await context.params;
  const result = await transitionSession(
    user.id,
    id,
    "pause",
    parsed.data.expectedRevision,
  );
  if (result.status === "not-found")
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (result.status === "conflict")
    return NextResponse.json(
      { error: result.error, timer: result.timer },
      { status: 409 },
    );
  return NextResponse.json({ session: result.session, timer: result.timer });
}
