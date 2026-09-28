"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/config/auth.config";
import {
  PersonalSettingsError,
  savePersonalSettings,
} from "@/features/settings/personal/services/personal-settings.service";

export async function savePersonalSettingsAction(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  try {
    await savePersonalSettings(
      {
        name: formData.get("name"),
        email: formData.get("email"),
        currentPassword: formData.get("currentPassword") ?? "",
      },
      await headers(),
    );

    // Invalidate the cached profile, preserving the actual sign-in session.
    const { sessionData } = (await auth.$context).authCookies;
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (
        cookie.name === sessionData.name ||
        cookie.name.startsWith(`${sessionData.name}.`)
      )
        cookieStore.set(cookie.name, "", {
          path: sessionData.attributes.path,
          domain: sessionData.attributes.domain,
          secure: sessionData.attributes.secure,
          httpOnly: true,
          maxAge: 0,
        });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof PersonalSettingsError
          ? error.message
          : error instanceof z.ZodError
            ? (error.issues[0]?.message ?? "Check your details.")
            : "Could not save your details. Your edits are preserved; please try again.",
    };
  }
}
