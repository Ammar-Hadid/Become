import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { NextResponse } from "next/server";
import { completeSession } from "@/features/sessions/lifecycle/services/complete-session.service";
import { completeSessionSchema } from "@/features/sessions/schemas/session.schema";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = completeSessionSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid session details." },
      { status: 400 },
    );

  const { id } = await context.params;
  const result = await completeSession(user.id, id, parsed.data).catch(
    (error) => {
      if (error instanceof BusinessError)
        return { status: "invalid-business" as const, error: error.message };
      throw error;
    },
  );
  if (result.status === "invalid-business")
    return NextResponse.json({ error: result.error }, { status: 400 });
  if (result.status === "not-found")
    return NextResponse.json(
      { error: "Active session not found." },
      { status: 404 },
    );
  if (result.status === "project-not-found")
    return NextResponse.json(
      { error: "Engineering project not found." },
      { status: 404 },
    );
  if (result.status === "invalid-engineering-details")
    return NextResponse.json(
      { error: "Engineering details require the Engineering domain." },
      { status: 400 },
    );
  if (result.status === "engineering-context-required")
    return NextResponse.json(
      { error: "Choose an Engineering context." },
      { status: 400 },
    );
  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    evidenceId: result.evidenceId,
    session: result.session,
    timer: result.timer,
  });
}
