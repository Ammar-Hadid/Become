import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse"],
  devIndicators: false,
  // Calendar boundaries must agree in server and browser code. This is public,
  // non-secret configuration and changing it requires a rebuild.
  env: { APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Europe/Amsterdam" },
  // Let isolated browser checks coexist with the regular development server.
  distDir: process.env.BECOME_E2E_PORT
    ? `.next-e2e-${process.env.BECOME_E2E_PORT}`
    : undefined,
  // The standalone typecheck runs before deployment. Repeating it inside the
  // memory-capped VPS build exceeds the Node heap limit.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Keep inactive-release builds within the shared VPS memory budget.
    webpackMemoryOptimizations: true,
    typedEnv: true,
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
