import { z } from "zod";

export const personalSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Keep your name within 120 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254)),
  currentPassword: z
    .string()
    .max(128, "Check your current password.")
    .default(""),
});
