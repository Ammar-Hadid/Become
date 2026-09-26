import { APIError } from "better-auth/api";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth/config/auth.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { personalSettingsSchema } from "@/features/settings/personal/schemas/personal-settings.schema";

export class PersonalSettingsError extends Error {}

export async function savePersonalSettings(
  input: unknown,
  requestHeaders: Headers,
) {
  // Sensitive mutations must check the persisted session, including revocation.
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
  if (!session)
    throw new PersonalSettingsError("Sign in before saving your details.");

  const { name, email, currentPassword } = personalSettingsSchema.parse(input);
  const emailChanged = email !== session.user.email;
  if (emailChanged) {
    if (!currentPassword)
      throw new PersonalSettingsError(
        "Enter your current password to change your email.",
      );
    try {
      await auth.api.verifyPassword({
        headers: requestHeaders,
        body: { password: currentPassword },
      });
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body?.code === "INVALID_PASSWORD")
          throw new PersonalSettingsError(
            "Your current password is incorrect.",
          );
        if (error.status === "UNAUTHORIZED")
          throw new PersonalSettingsError(
            "Sign in again before changing your email.",
          );
      }
      throw error;
    }
  }

  try {
    // One write keeps the profile unchanged if an email collision occurs.
    // The previous email also guards against overlapping email changes.
    await prisma.user.update({
      where: { id: session.user.id, email: session.user.email },
      data: { name, email, ...(emailChanged ? { emailVerified: false } : {}) },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        throw new PersonalSettingsError(
          "That email is already in use. Choose another email.",
        );
      if (error.code === "P2025")
        throw new PersonalSettingsError(
          "Your details changed elsewhere. Reload before saving.",
        );
    }
    throw error;
  }
}
