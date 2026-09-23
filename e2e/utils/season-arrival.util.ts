import { expect, type Page } from "@playwright/test";

export async function deferAutomaticSeasonOpening(page: Page) {
  const opening = /\/direction\/seasons\/\d{4}\/[1-4]\/opening/;
  await expect(page).toHaveURL(
    (url) => url.pathname === "/" || opening.test(url.pathname),
    { timeout: 15_000 },
  );
  // Early interaction can suppress the first automatic arrival. Explicitly
  // defer through the real arrival surface so a later Home visit cannot
  // interrupt these domain journeys. Dedicated COTS suites test auto-arrival.
  if (!opening.test(new URL(page.url()).pathname)) {
    await page.goto("/direction");
    const href = await page
      .getByRole("link", { name: "Open your season" })
      .getAttribute("href");
    if (!href)
      throw new Error("The current Season entry point is unavailable.");
    const arrival = new URL(href, page.url());
    arrival.searchParams.set("arrival", "season");
    await page.goto(arrival.toString());
  }
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/", {
    timeout: 15_000,
  });
  await expect(page.locator("#dashboard-greeting")).toBeVisible({
    timeout: 15_000,
  });
}
