import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import {
  FinanceError,
  type FinanceFormState,
} from "@/features/finance/types/finance.types";

export async function financeMutation(
  run: (userId: string) => Promise<{ id?: string; more?: boolean } | void>,
): Promise<FinanceFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  try {
    const result = await run(user.id);
    revalidatePath("/finance", "layout");
    revalidatePath("/entrepreneurship", "layout");
    revalidatePath("/");
    revalidatePath("/settings", "layout");
    return {
      error: null,
      success: "Saved.",
      id: result?.id,
      more: result?.more,
    };
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? "Check your entries." };
    if (error instanceof FinanceError) return { error: error.message };
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2003", "P2025"].includes(error.code)
    )
      return {
        error:
          "This record changed or conflicts with existing history. Refresh and review your entries.",
      };
    console.error("Finance mutation failed", error);
    return {
      error:
        "Could not save. Your entries have been preserved. Please try again.",
    };
  }
}
