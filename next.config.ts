import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let isolated browser checks coexist with the regular development server.
  distDir: process.env.BECOME_E2E_PORT ? ".next-e2e" : undefined,
  experimental: {
    typedEnv: true,
  },
};

export default nextConfig;
