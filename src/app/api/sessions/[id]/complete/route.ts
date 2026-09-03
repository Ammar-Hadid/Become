import { NextResponse } from "next/server";
import { completeSession } from "@/features/sessions/complete-session.service";
import { completeSessionSchema } from "@/features/sessions/session.schema";
import { getCurrentUser } from "@/lib/auth/current-user.query";

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
  const completed = await completeSession(user.id, id, parsed.data);
  if (!completed)
    return NextResponse.json(
      { error: "Active session not found." },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
