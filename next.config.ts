import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Calendar boundaries must agree in server and browser code. This is public,
  // non-secret configuration and changing it requires a rebuild.
  env: { APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Europe/Amsterdam" },
  // Let isolated browser checks coexist with the regular development server.
  distDir: process.env.BECOME_E2E_PORT ? ".next-e2e" : undefined,
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
