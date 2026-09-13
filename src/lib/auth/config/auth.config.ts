import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { getServerEnv } from "@/lib/config/server-environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

const env = getServerEnv();

export const auth = betterAuth({
  appName: "Become",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  advanced: {
    // Caddy overwrites X-Forwarded-For; Next listens only on loopback.
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: !env.BECOME_ALLOW_SIGNUP,
    minPasswordLength: 8,
  },
  session: {
    modelName: "AuthSession",
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: { modelName: "Account" },
  verification: { modelName: "Verification" },
  user: { modelName: "User" },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureDefaultDomains(user.id);
        },
      },
    },
  },
});
