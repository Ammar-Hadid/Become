"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { saveNexoSettings } from "@/features/nexo/services/nexo-settings.service";
import { NexoError } from "@/features/nexo/types/nexo.types";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
export async function saveNexoSettingsAction(
  expectedVersion: number,
  input: unknown,
): Promise<RecordFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in before saving." };
  try {
    await saveNexoSettings(user.id, expectedVersion, input);
    revalidatePath("/settings/nexo");
    revalidatePath("/entrepreneurship", "layout");
    return { error: null, success: "Nexo settings saved." };
  } catch (error) {
    return {
      error:
        error instanceof NexoError
          ? error.message
          : error instanceof z.ZodError
            ? (error.issues[0]?.message ?? "Check your settings.")
            : "Could not save settings. Your edits are preserved.",
    };
  }
}
