import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";

// Each local browser journey represents a separate client. Production auth
// limits remain enabled instead of all parallel signups sharing one IP bucket.
export const test = base.extend({
  extraHTTPHeaders: async ({ baseURL }, provideHeaders) => {
    if (!baseURL || new URL(baseURL).hostname !== "localhost")
      throw new Error("Browser fixtures require the local application.");
    await provideHeaders({
      "x-forwarded-for": `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
    });
  },
});
export { expect, type Page, type Locator } from "@playwright/test";
