import { defineConfig, devices } from "@playwright/test";

const isolatedPort = process.env.BECOME_E2E_PORT;
const port = Number(isolatedPort ?? 3010);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("BECOME_E2E_PORT must be a local development port.");
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./e2e",
  timeout: isolatedPort ? 120_000 : 30_000,
  expect: { timeout: isolatedPort ? 15_000 : 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["iPad Pro 11"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `BETTER_AUTH_URL=${baseURL} ./node_modules/.bin/next dev ${isolatedPort ? "--webpack " : ""}-p ${port}`,
    url: `${baseURL}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
