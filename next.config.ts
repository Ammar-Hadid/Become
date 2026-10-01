import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse"],
  // Calendar boundaries must agree in server and browser code. This is public,
  // non-secret configuration and changing it requires a rebuild.
  env: { APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Europe/Amsterdam" },
  // Let isolated browser checks coexist with the regular development server.
  distDir: process.env.BECOME_E2E_PORT
    ? `.next-e2e-${process.env.BECOME_E2E_PORT}`
    : undefined,
  experimental: {
    typedEnv: true,
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
