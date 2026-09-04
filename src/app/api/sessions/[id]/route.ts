import { NextResponse } from "next/server";
import { getCompletedSessionById } from "@/features/sessions/queries/session.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

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
