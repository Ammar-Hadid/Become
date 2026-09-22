import { NextResponse } from "next/server";
import { getCompletedSessionById } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getServerEnv } from "@/lib/config/server-environment.config";
import { isTrustedRequestOrigin } from "@/lib/http/utils/request-origin.util";
import { correctSessionEnd } from "@/features/sessions/lifecycle/services/correct-session-end.service";
import { correctSessionEndSchema } from "@/features/sessions/schemas/session.schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const session = await getCompletedSessionById(user.id, id);
  if (!session)
    return NextResponse.json(
      { error: "Completed session not found." },
      { status: 404 },
    );

  return NextResponse.json(session);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isTrustedRequestOrigin(request, getServerEnv().BETTER_AUTH_URL))
    return NextResponse.json(
      { error: "This request must come from Become." },
      { status: 403 },
    );
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = correctSessionEndSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid end time." }, { status: 400 });

  const { id } = await context.params;
  const result = await correctSessionEnd(
    user.id,
    id,
    new Date(parsed.data.endedAt),
    new Date(parsed.data.expectedEndedAt),
  );
  if (result.status === "not-found")
    return NextResponse.json(
      { error: "Completed session not found." },
      { status: 404 },
    );
  if (result.status === "conflict")
    return NextResponse.json(
      { error: "This session changed. Reopen it and try again." },
      { status: 409 },
    );
  if (result.status === "invalid-end")
    return NextResponse.json(
      { error: "Choose a time between the session start and now." },
      { status: 400 },
    );
  return NextResponse.json(result.session);
}
