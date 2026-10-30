import { expect, type Page } from "@playwright/test";

export async function openSessionHistory(page: Page) {
  const account = page.locator('button[aria-label="Account"]:visible');
  if (!(await account.count()))
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await account.click();
  await page.getByRole("menuitem", { name: "Session history", exact: true }).click();
  await expect(page).toHaveURL(/\/sessions$/);
}
