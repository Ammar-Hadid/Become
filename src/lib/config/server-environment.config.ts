import { z } from "zod";
import { mediaDataRoot } from "@/lib/storage/adapters/filesystem-media.adapter";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
      "DATABASE_URL must use PostgreSQL.",
    ),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3010"),
  APP_TIMEZONE: z.string().default("Europe/Amsterdam"),
  BECOME_ALLOW_SIGNUP: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
});

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
  const production = source.NODE_ENV === "production";
  const env = serverEnvSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    APP_TIMEZONE: source.APP_TIMEZONE,
    BECOME_ALLOW_SIGNUP:
      source.BECOME_ALLOW_SIGNUP ?? (production ? "false" : "true"),
  });
  // Fail before serving requests, rather than losing uploads inside a release.
  if (production) {
    const origin = new URL(env.BETTER_AUTH_URL);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
    )
      throw new Error(
        "Production BETTER_AUTH_URL must be the public HTTPS origin, with no path.",
      );
    if (
      /replace[-_ ]with|change[-_ ]me|development|test[-_ ]secret/i.test(
        env.BETTER_AUTH_SECRET,
      )
    )
      throw new Error("Production requires a generated BETTER_AUTH_SECRET.");
    if (source.BECOME_E2E_PORT)
      throw new Error("BECOME_E2E_PORT must not be set in production.");
    mediaDataRoot(source);
  }
  // Intl validates IANA zones without relying on host-local timezone defaults.
  new Intl.DateTimeFormat("en", { timeZone: env.APP_TIMEZONE });
  return env;
}
