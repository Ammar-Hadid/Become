import { describe, expect, it } from "vitest";
import { getServerEnv } from "./server-environment.config";

const production: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://user:password@db.example.com/become?sslmode=verify-full",
  BETTER_AUTH_SECRET: "e321f3ddafe930496613108972cbcc71c6ed1d48888305d07",
  BETTER_AUTH_URL: "https://become.example.com",
  BECOME_DATA_DIR: "/srv/data/become",
};

describe("production environment", () => {
  it("closes registration by default and accepts deliberate bootstrap", () => {
    expect(getServerEnv(production).BECOME_ALLOW_SIGNUP).toBe(false);
    expect(
      getServerEnv({ ...production, BECOME_ALLOW_SIGNUP: "true" })
        .BECOME_ALLOW_SIGNUP,
    ).toBe(true);
    expect(
      getServerEnv({ ...production, NODE_ENV: "development" })
        .BECOME_ALLOW_SIGNUP,
    ).toBe(true);
  });
  it.each([
    { BETTER_AUTH_URL: undefined },
    { BETTER_AUTH_URL: "http://become.example.com" },
    { BETTER_AUTH_URL: "https://localhost" },
    { BETTER_AUTH_URL: "https://become.example.com/path" },
    { BETTER_AUTH_SECRET: "replace-with-at-least-32-random-characters" },
    { BETTER_AUTH_SECRET: "REPLACE_WITH_OPENSSL_RAND_HEX_32_OUTPUT" },
    { BECOME_DATA_DIR: "" },
    { BECOME_DATA_DIR: process.cwd() + "/uploads" },
    { BECOME_E2E_PORT: "3021" },
    { DATABASE_URL: "https://example.com" },
    { APP_TIMEZONE: "invalid" },
    { BECOME_ALLOW_SIGNUP: "yes" },
  ])("fails closed for invalid configuration %j", (change) => {
    expect(() => getServerEnv({ ...production, ...change })).toThrow();
  });
});
