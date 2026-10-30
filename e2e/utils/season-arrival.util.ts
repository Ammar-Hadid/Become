import { expect, type Page } from "@playwright/test";

export async function deferAutomaticSeasonOpening(page: Page) {
  const opening = /\/direction\/seasons\/\d{4}\/[1-4]\/opening/;
  await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/, { timeout: 30_000 });
  // Sign-up briefly visits Home before the automatic arrival. Navigating away
  // during that intermediate state races the pending client navigation.
  await expect(page).toHaveURL(opening, { timeout: 15_000 });
  const deferred = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/direction/cots" &&
      response.request().method() === "POST" &&
      response.request().postDataJSON()?.action === "DEFER_OPENING",
  );
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  // Not now returns immediately; the next journey waits for the saved choice
  // so a full navigation does not abort this fixture's background request.
  expect((await deferred).ok()).toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === "/", {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("region", { name: "Dashboard lenses", exact: true }),
  ).toBeVisible({
    timeout: 15_000,
  });
}
