import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { getServerEnv } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

const env = getServerEnv();

export const auth = betterAuth({
  appName: "Become",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
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
