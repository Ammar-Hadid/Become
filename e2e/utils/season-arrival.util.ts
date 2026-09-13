import { expect, type Page } from "@playwright/test";

export async function deferAutomaticSeasonOpening(page: Page) {
  await expect(page).toHaveURL(/\/direction\/seasons\/\d{4}\/[1-4]\/opening/, {
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/", {
    timeout: 15_000,
  });
  await expect(page.locator("#dashboard-greeting")).toBeVisible({
    timeout: 15_000,
  });
}
