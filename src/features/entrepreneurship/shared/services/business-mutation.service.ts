import { FinanceError } from "@/features/finance/types/finance.types";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";

export async function businessMutation(
  run: (userId: string) => Promise<{ id?: string } | void>,
): Promise<RecordFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in before saving." };
  try {
    const result = await run(user.id);
    revalidatePath("/entrepreneurship", "layout");
    revalidatePath("/finance", "layout");
    revalidatePath("/");
    return { error: null, success: "Saved.", id: result?.id };
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const prefix =
        issue?.path[0] === "observations"
          ? `Observation ${Number(issue.path[1]) + 1}: `
          : issue?.path[0] === "participants"
            ? `Participant ${Number(issue.path[1]) + 1}: `
            : "";
      return { error: prefix + (issue?.message ?? "Check your entries.") };
    }
    if (error instanceof BusinessError || error instanceof FinanceError)
      return { error: error.message };
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2003", "P2025"].includes(error.code)
    )
      return {
        error:
          "This record changed or conflicts with existing history. Your entries are preserved; review and try again.",
      };
    console.error("Business capture failed", error);
    return {
      error: "Could not save. Your entries are still here; please try again.",
    };
  }
}
