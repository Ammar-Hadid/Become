import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getOpenBankingConfig } from "@/features/open-banking/config/open-banking.config";
import { completeBankAuthorization } from "@/features/open-banking/connections/services/bank-connection.service";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const origin = new URL(getOpenBankingConfig().callbackUrl).origin;
  if (!user)
    return NextResponse.redirect(
      new URL("/sign-in?bankAuthorization=retry", origin),
    );
  const state = request.nextUrl.searchParams.get("state") ?? "";
  try {
    const result = await completeBankAuthorization(user.id, {
      state,
      code: request.nextUrl.searchParams.get("code") ?? undefined,
      error: request.nextUrl.searchParams.get("error") ?? undefined,
    });
    return NextResponse.redirect(
      new URL(
        `/finance/accounts?connection=${encodeURIComponent(result.id)}&bankAuthorization=connected`,
        origin,
      ),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/finance/accounts?bankAuthorization=failed", origin),
    );
  }
}
