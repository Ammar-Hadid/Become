import { test, expect } from "@playwright/test";
const route = "/season-opening-layout-candidate?year=2027&quarter=2";
const key = "become-opening-layout-preview-v1:2027:2";

test("four focused preparation screens, revision, motion and local resume", async ({
  page,
}) => {
  const errors: string[] = [];
  const apiCalls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiCalls.push(request.url());
  });
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Find my character", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Season 2 · 2027", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator(".opening-layout-introduction h1")).toHaveText(
    "Who will inspire this Season?",
  );
  await expect(page.locator(".opening-step-numeral")).toHaveText("01");
  await expect(page.locator(".opening-layout-content h1")).toHaveCount(0);
  await expect(page.locator(".opening-step-kicker")).toHaveCount(0);
  await expect(
    page.getByText("A new Season begins.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[aria-label="Season phases"] [aria-current="step"]'),
  ).toContainText("Character");
  await expect(
    page.locator('[aria-label="Character preparation"] li'),
  ).toHaveCount(4);
  await page
    .getByRole("button", { name: "Find my character", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Is this your character?", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.locator(".opening-step-numeral")).toHaveText("02");
  await page
    .getByRole("button", { name: "Different version", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Character adaptation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Yes, this character", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Shape the world of your Season.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await expect(page.locator(".opening-step-numeral")).toHaveText("03");
  await page
    .getByRole("textbox", {
      name: "Where should this Season take place?",
      exact: true,
    })
    .fill("A coastal city at sunrise");
  await page
    .getByRole("textbox", { name: "How should it feel and look?", exact: true })
    .fill("Quiet, airy, warm coastal light");
  await expect(
    page.getByRole("button", { name: "Prepare my Season", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Prepare my Season", exact: true })
    .click();
  await expect(page.locator(".opening-step-content")).toHaveAttribute(
    "data-stage",
    "ASSEMBLING",
  );
  await page
    .getByRole("button", { name: "Pause preparation", exact: true })
    .click();
  await expect(
    page.locator('[aria-label="Character preparation"] [aria-current="step"]'),
  ).toContainText("Summary");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume preparation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume preparation", exact: true })
    .click();
  await expect(page.locator(".opening-step-content")).toHaveAttribute(
    "data-stage",
    "SUMMARY",
  );
  await expect(page.locator(".opening-step-numeral")).toHaveText("04");
  await expect(
    page.getByRole("article", { name: "AI-prepared Season summary" }),
  ).toBeVisible();
  await expect(page.locator(".opening-summary-content")).toContainText(
    "A coastal city at sunrise",
  );
  await expect(page.locator(".ai-typing-text")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pause motion", exact: true })
    .press("Enter");
  await expect(page.locator(".become-season-ritual")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  expect(
    await page
      .locator(".become-ambient-light__field")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await page
    .getByRole("button", { name: "Request changes", exact: true })
    .click();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await page.getByRole("textbox").fill("Make the setback response gentler.");
  await page
    .getByRole("button", { name: "Update my Season", exact: true })
    .click();
  await expect(page.locator(".opening-step-content")).toHaveAttribute(
    "data-stage",
    "SUMMARY",
  );
  await expect(
    page.getByText(
      "Requested change in this preview: Make the setback response gentler.",
    ),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".living-ink-copy")).toHaveAttribute(
    "data-complete",
    "true",
  );
  expect(
    await page
      .locator(".become-ambient-light__field")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Approve and create artwork", exact: true })
    .click();
  await expect(
    page.locator('[aria-label="Season phases"] [aria-current="step"]'),
  ).toContainText("Imagery");
  await expect(
    page.locator('[aria-label="Character preparation"]'),
  ).toHaveCount(0);
  await expect(page.locator(".guided-review")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Approve banners and continue",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByRole("main")).toHaveCount(1);
  const stored = await page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey)!),
    key,
  );
  expect(stored.setting).toBe("A coastal city at sunrise");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("a local save failure stays visible and does not falsely leave", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled for test");
    };
  });
  await page.goto(route);
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Save and leave", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp("season-opening-layout-candidate"));
  await expect(page.locator(".opening-error[role=alert]")).toContainText(
    "could not save the preview",
  );
  await expect(page.getByRole("textbox")).toHaveCount(2);
});

test("failure retains step four and activation is a separate explicit phase", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByText("Review states · layout sample only", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparation failure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your draft is still here.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator('[aria-label="Character preparation"] [aria-current="step"]'),
  ).toContainText("Summary");
  await page
    .getByRole("button", { name: "Retry preparation", exact: true })
    .click();
  await expect(page.locator(".opening-step-content")).toHaveAttribute(
    "data-stage",
    "SUMMARY",
  );
  await page.getByRole("button", { name: "ready", exact: true }).click();
  await expect(
    page.locator('[aria-label="Season phases"] [aria-current="step"]'),
  ).toContainText("Activate Season");
  await page
    .getByRole("button", { name: "Activate Season", exact: true })
    .click();
  await expect(
    page.locator('[aria-label="Season phases"] [data-state="complete"]'),
  ).toHaveCount(3);
});

test("preparation stays at viewport height with only its working section scrolling", async ({
  page,
}) => {
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Find my character", exact: true }),
  ).toBeEnabled();
  const workspace = page.getByRole("region", {
    name: "Season preparation workspace",
    exact: true,
  });
  for (const stage of ["entry", "confirm", "world", "summary"]) {
    if (stage !== "entry") {
      const review = page.locator(".opening-layout-review-controls");
      if ((await review.getAttribute("open")) === null)
        await page
          .getByText("Review states · layout sample only", { exact: true })
          .click();
      await page.getByRole("button", { name: stage, exact: true }).click();
    }
    await expect(workspace).toBeVisible();
    const size = await page.evaluate(() => ({
      height: innerHeight,
      document: document.documentElement.scrollHeight,
      shell: document
        .querySelector(".become-season-ritual")!
        .getBoundingClientRect().height,
      footer: document
        .querySelector(".opening-layout-footer")!
        .getBoundingClientRect().bottom,
      pageScroll: scrollY,
    }));
    expect(size.document).toBeLessThanOrEqual(size.height + 1);
    expect(size.shell).toBeCloseTo(size.height, 0);
    expect(size.footer).toBeCloseTo(size.height, 0);
    expect(size.pageScroll).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const titleBefore = await page
    .locator(".opening-layout-introduction h1")
    .boundingBox();
  await workspace.focus();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => workspace.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const titleAfter = await page
    .locator(".opening-layout-introduction h1")
    .boundingBox();
  expect(titleAfter!.y).toBeCloseTo(titleBefore!.y, 0);
  const review = page.locator(".opening-layout-review-controls");
  if ((await review.getAttribute("open")) === null)
    await page
      .getByText("Review states · layout sample only", { exact: true })
      .click();
  await page.getByRole("button", { name: "world", exact: true }).click();
  await expect
    .poll(() => workspace.evaluate((element) => element.scrollTop))
    .toBe(0);
  await page.getByRole("button", { name: "banner", exact: true }).click();
  await expect(workspace).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeGreaterThan(await page.evaluate(() => innerHeight));
});

test("shared ambient light persists through imagery and activation with motion controls", async ({
  page,
}) => {
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Find my character", exact: true }),
  ).toBeEnabled();
  const field = page.locator(".become-ambient-light__field");
  const original = await field.elementHandle();
  expect(original).not.toBeNull();
  for (const stage of ["banner", "scenes", "ready", "active"]) {
    const controls = page.locator(".opening-layout-review-controls");
    if ((await controls.getAttribute("open")) === null)
      await controls.locator("summary").click();
    await controls.getByRole("button", { name: stage, exact: true }).click();
    await expect(field).toHaveCount(1);
    expect(await original!.evaluate((el) => el.isConnected)).toBe(true);
    await page
      .getByRole("button", { name: "Pause motion", exact: true })
      .click();
    await expect(page.locator(".become-ambient-light")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    const transforms = () =>
      field.evaluate((el) =>
        ["::before", "::after"].map(
          (pseudo) => getComputedStyle(el, pseudo).transform,
        ),
      );
    // Let the browser commit the paused style before sampling its compositor.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const paused = await transforms();
    await page.waitForTimeout(100);
    expect(await transforms()).toEqual(paused);
    await page
      .getByRole("button", { name: "Resume motion", exact: true })
      .click();
    await expect(page.locator(".become-ambient-light")).toHaveAttribute(
      "data-motion",
      "running",
    );
    await expect.poll(transforms).not.toEqual(paused);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await field.evaluate((el) =>
      ["::before", "::after"].map(
        (pseudo) => getComputedStyle(el, pseudo).animationName,
      ),
    ),
  ).toEqual(["none", "none"]);
});
