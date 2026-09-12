import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { test, expect, type Page } from "./utils/browser-test.util";

async function workspace(page: Page, origin: string) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Disposable Content workspace QA");
  await page
    .getByTestId("email-input")
    .fill(`content-workspace-${randomUUID()}@example.com`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-content-password");
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(/\/direction\/seasons\/\d{4}\/\d\/opening/);
  const response = await page.request.post("/api/content/commands", {
    headers: { origin },
    data: {
      type: "CREATE_CONTENT",
      operationKey: randomUUID(),
      format: "LONG_FORM",
      draft: {
        title: "Keep the making time moving",
        purpose: "A useful next step",
        audience: "",
        notes: "",
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const data = (await response.json()).workspace;
  await page.goto(`/content/${data.id}`);
  return data;
}

test("Content focus ticks and can restart after completion without waiting for a route refresh", async ({
  page,
  baseURL,
}) => {
  await workspace(page, baseURL!);
  const rail = page.getByRole("complementary", { name: "Variant progress" });
  const guidance = rail.locator(".content-stage-guidance");
  const form = rail.locator(".content-progress-form");
  expect(
    Math.abs(
      (await guidance.boundingBox())!.width - (await form.boundingBox())!.width,
    ),
  ).toBeLessThan(2);
  // Keep an unsaved writing draft while the timer changes.
  await page
    .getByRole("textbox", { name: "Hook", exact: true })
    .fill("Keep this draft through timer changes.");
  await expect(page.locator(".content-writing")).toContainText("Saved");

  // A timer begun elsewhere must be visible here and finish before Content starts.
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
  await page.getByTestId("engineering-context-select").selectOption("PERSONAL");
  await page.getByTestId("confirm-start-timer").click();
  await expect(
    rail.getByRole("button", { name: "Complete other session" }),
  ).toBeVisible();
  await rail.getByRole("button", { name: "Complete other session" }).click();
  await page.getByTestId("session-outcome").fill("Finished the earlier timer.");
  await page.getByTestId("confirm-stop-timer").click();
  await expect(page.getByTestId("confirm-stop-timer")).not.toBeVisible();

  // Deliberately delay refreshed server components. Mutation acknowledgements
  // must drive the controls while the previous layout is still on screen.
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*_rsc=*", async (route) => {
    await held;
    // New refreshes can cancel older held requests.
    await route.continue().catch(() => {});
  });
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const [started] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/sessions") &&
            r.request().method() === "POST",
        ),
        rail.getByRole("button", { name: "Start focus", exact: true }).click(),
      ]);
      expect(started.status(), await started.text()).toBe(201);
      const session = (await started.json()).session;
      await expect(
        rail.getByRole("button", { name: "Complete active session" }),
      ).toBeVisible();
      await expect(
        rail.getByRole("button", { name: "Start focus", exact: true }),
      ).toHaveCount(0);
      await page.clock.install({ time: new Date(session.startedAt) });
      await page.clock.fastForward(65_000);
      await expect(rail.locator(".content-time header strong")).toHaveText(
        /^00:01:\d{2}$/,
      );
      await page.clock.resume();
      await rail
        .getByRole("button", { name: "Complete active session" })
        .click();
      await page.getByTestId("session-outcome").fill("Finished this pass.");
      const [stopped] = await Promise.all([
        page.waitForResponse((r) =>
          r.url().endsWith(`/api/sessions/${session.id}/complete`),
        ),
        page.getByTestId("confirm-stop-timer").click(),
      ]);
      expect(stopped.ok(), await stopped.text()).toBe(true);
      await expect(page.getByTestId("confirm-stop-timer")).not.toBeVisible();
      await expect(
        rail.getByRole("button", { name: "Start focus", exact: true }),
      ).toBeVisible();
    }
  } finally {
    release();
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
  await expect(
    page.getByRole("textbox", { name: "Hook", exact: true }),
  ).toHaveValue("Keep this draft through timer changes.");
  await expect(rail.getByRole("alert")).toHaveCount(0);
});

test("recent releases show the released variant thumbnail and a responsive date", async ({
  page,
  baseURL,
}, testInfo) => {
  const content = await workspace(page, baseURL!);
  const variant = content.variants[0];
  const buffer = await sharp({
    create: { width: 180, height: 240, channels: 3, background: "#95724b" },
  })
    .png()
    .toBuffer();
  const uploaded = await page.request.post("/api/content/media/upload", {
    headers: { origin: baseURL! },
    multipart: {
      contentId: content.id,
      variantId: variant.id,
      expectedMediaVersion: String(variant.mediaVersion),
      operationKey: randomUUID(),
      file: { name: "release.png", mimeType: "image/png", buffer },
    },
  });
  expect(uploaded.ok(), await uploaded.text()).toBe(true);
  const mediaId = (await uploaded.json()).id;
  const channel = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "SAVE_CHANNEL",
      operationKey: randomUUID(),
      draft: { name: "Main", platform: "YOUTUBE", account: "@qa" },
    },
  });
  expect(channel.ok(), await channel.text()).toBe(true);
  const released = await page.request.post("/api/content/commands", {
    headers: { origin: baseURL! },
    data: {
      type: "PUBLISH",
      contentId: content.id,
      variantId: variant.id,
      operationKey: randomUUID(),
      publications: [
        {
          channelId: (await channel.json()).id,
          publishedTitle: content.title,
          publishedOn: "2026-09-12",
          url: "",
          placement: "",
        },
      ],
    },
  });
  expect(released.ok(), await released.text()).toBe(true);
  await page.goto("/content");
  const row = page.locator(".content-recent li");
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator("img")).toHaveAttribute(
    "src",
    `/api/content/media/${mediaId}`,
  );
  await expect
    .poll(() =>
      row
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(row.locator("img")).toHaveCSS("object-fit", "contain");
  await expect(row.locator("time")).toHaveAttribute("datetime", "2026-09-12");
  await expect(row.getByRole("link")).toHaveAttribute(
    "href",
    `/content/${content.id}?variant=${variant.id}`,
  );
  await row.scrollIntoViewIfNeeded();
  await row.screenshot({ path: testInfo.outputPath("recent-release.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
