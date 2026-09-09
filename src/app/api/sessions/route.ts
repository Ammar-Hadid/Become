import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { NextResponse } from "next/server";
import { startSessionSchema } from "@/features/sessions/schemas/session.schema";
import { startSession } from "@/features/sessions/lifecycle/services/start-session.service";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { FinanceError } from "@/features/finance/types/finance.types";

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

  const result = await startSession(user.id, parsed.data).catch((error) => {
    if (error instanceof FinanceError || error instanceof BusinessError)
      return { status: "invalid-finance" as const, error: error.message };
    throw error;
  });
  if (result.status === "invalid-finance")
    return NextResponse.json({ error: result.error }, { status: 400 });
  if (result.status === "activity-not-found") {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }
  if (result.status === "already-active") {
    return NextResponse.json(
      { error: "A timer is already running." },
      { status: 409 },
    );
  }
  if (result.status === "engineering-context-required") {
    return NextResponse.json(
      { error: "Choose an Engineering context." },
      { status: 400 },
    );
  }
  if (result.status === "invalid-engineering-details") {
    return NextResponse.json(
      { error: "Engineering details require the Engineering domain." },
      { status: 400 },
    );
  }
  if (result.status === "project-not-found") {
    return NextResponse.json(
      { error: "Engineering project not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: result.sessionId }, { status: 201 });
}
