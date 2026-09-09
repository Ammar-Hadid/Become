import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";
import { deleteDisposableBrowserUser } from "./disposable-user.util";

// Each local browser journey represents a separate client. Production auth
// limits remain enabled instead of all parallel signups sharing one IP bucket.
export const test = base.extend({
  page: async ({ page }, providePage) => {
    const registrations: Promise<{ id: string; email: string } | null>[] = [];
    page.on("response", (response) => {
      if (
        new URL(response.url()).pathname !== "/api/auth/sign-up/email" ||
        !response.ok()
      )
        return;
      registrations.push(
        response
          .json()
          .then((body) =>
            body.user?.id && body.user?.email
              ? { id: String(body.user.id), email: String(body.user.email) }
              : null,
          )
          .catch(() => null),
      );
    });
    await providePage(page);
    for (const user of await Promise.all(registrations))
      if (user) await deleteDisposableBrowserUser(user.id, user.email);
  },
  extraHTTPHeaders: async ({ baseURL }, provideHeaders) => {
    if (!baseURL || new URL(baseURL).hostname !== "localhost")
      throw new Error("Browser fixtures require the local application.");
    await provideHeaders({
      "x-forwarded-for": `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
    });
  },
});
export { expect, type Page, type Locator } from "@playwright/test";
