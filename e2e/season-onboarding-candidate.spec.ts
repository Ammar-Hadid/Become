import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/season-onboarding-candidate");
  await page.evaluate(() =>
    localStorage.removeItem("become-season-onboarding-candidate-v1"),
  );
  await page.reload();
});

test("guides two-question entry through summary corrections and approval", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Who will inspire this Season?",
  );
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await page.getByRole("button", { name: "Find my character" }).click();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "SUMMARY");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  const frame = page.locator(".become-ai-text-frame");
  const article = frame.getByRole("article", {
    name: "AI-prepared Season summary",
  });
  await expect(article).toBeVisible();
  await expect(
    article.getByRole("heading", { name: "AI-prepared Season summary" }),
  ).toBeVisible();
  await expect(
    article.getByText("Levi Ackerman · Attack on Titan · TV anime", {
      exact: true,
    }),
  ).toBeVisible();
  const generatedText = article.locator(".living-ink-copy");
  await expect(generatedText).toHaveAttribute("data-complete", "false");
  await expect(article.locator(".ai-typing-text")).toHaveCount(0);
  await generatedText
    .locator(".living-ink-paragraph")
    .first()
    .scrollIntoViewIfNeeded();
  await expect(
    generatedText.locator(".living-ink-paragraph").first(),
  ).toHaveAttribute("data-reveal", "true");
  await expect(
    generatedText.locator(".living-ink-paragraph").nth(1),
  ).toHaveAttribute("data-pending", "true");
  await expect(generatedText.locator(".sr-only").first()).toContainText(
    "Levi brings",
  );
  await expect(
    page.getByRole("button", { name: "Show full summary" }),
  ).toHaveCount(0);
  await expect(article.getByRole("link")).toHaveAttribute("target", "_blank");
  const layout = await frame.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    viewport: window.innerWidth,
    overflows: document.documentElement.scrollWidth > window.innerWidth,
  }));
  expect(layout.width).toBeLessThan(layout.viewport);
  expect(layout.overflows).toBe(false);
  await page.getByRole("button", { name: "Pause motion" }).press("Enter");
  await expect(
    page.getByRole("button", { name: "Resume motion" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(frame).toHaveAttribute("data-animated", "false");
  await page.getByRole("button", { name: "Resume motion" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(generatedText).toHaveAttribute("data-complete", "true");
  expect(
    await article.evaluate(
      (element) => getComputedStyle(element, "::before").animationName,
    ),
  ).toBe("none");
  await expect(article.getByRole("link")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Request changes" }).click();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await page.getByRole("textbox").fill("Make his setback response less harsh.");
  await page.getByRole("button", { name: "Update my Season" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "SUMMARY");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "SUMMARY");
  await expect(generatedText).toHaveAttribute("data-complete", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(generatedText).toHaveAttribute("data-complete", "true");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Approve and continue" })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "BANNER");
  await expect(
    page.getByRole("button", { name: "Approve banners and continue" }),
  ).toBeDisabled();
  await expect(page.locator("body")).not.toContainText("Application error");
  expect(errors).toEqual([]);
});

test("banners and profile portrait have separate review steps", async ({
  page,
}) => {
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "banner", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Levi Ackerman portrait", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Adjust portrait", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Approve banners and continue",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Creating your profile picture.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "PORTRAIT");
  await expect(
    page.getByRole("img", { name: "Levi Ackerman portrait", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Character identity", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Try another phone banner", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Approve profile and choose scene creation",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "PORTRAIT");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Approve profile and choose scene creation",
      exact: true,
    })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "SCENES");
});

test("phone banner shows identity over a bottom overlay at every preview size", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "banner", exact: true }).click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  const phone = page.locator(".guided-phone-banner");
  await expect(phone.getByText("Character of the Season")).toBeVisible();
  await expect(
    phone.getByRole("heading", { name: "Levi Ackerman", exact: true }),
  ).toBeVisible();
  await expect(phone.getByText("Attack on Titan · TV anime")).toBeVisible();
  const checkComposition = async () => {
    const layout = await phone.evaluate((element) => {
      const banner = element.querySelector(".become-character-banner")!;
      const copy = element.querySelector(".become-character-banner__copy")!;
      const frame = element.getBoundingClientRect();
      const text = copy.getBoundingClientRect();
      return {
        textTop: (text.top - frame.top) / frame.height,
        textBottom: (text.bottom - frame.top) / frame.height,
        contained: text.left >= frame.left && text.right <= frame.right,
        overlay: getComputedStyle(banner, "::before").backgroundImage,
        extraFade: getComputedStyle(element.parentElement!, "::after").display,
      };
    });
    // The sample character's face is in the upper half; identity stays below it.
    expect(layout.textTop).toBeGreaterThan(0.6);
    expect(layout.textBottom).toBeLessThan(1);
    expect(layout.contained).toBe(true);
    expect(layout.overlay).toContain("0deg");
    expect(layout.overlay).toContain("72%");
    expect(layout.extraFade).toBe("none");
  };
  await checkComposition();
  await page
    .getByRole("separator", { name: /phone preview width$/i })
    .press("End");
  await page
    .getByRole("separator", { name: /phone preview height$/i })
    .press("End");
  await checkComposition();
  await page.getByRole("button", { name: "scenes", exact: true }).click();
  await expect(phone).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("requires review of all pace states and keeps failed work resumable", async ({
  page,
}) => {
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "scenes", exact: true }).click();
  await expect(page.getByRole("checkbox")).toBeDisabled();
  const reviewStatus = page.locator(".guided-review-status");
  await expect(reviewStatus).toContainText("1 of 6 compositions viewed");
  await expect(reviewStatus).toContainText("On track (mobile)");
  await expect(reviewStatus).toContainText("In progress (desktop and mobile)");
  await expect(reviewStatus).toContainText("Behind pace (desktop and mobile)");
  await page.getByRole("button", { name: "In progress", exact: true }).click();
  await page.getByRole("button", { name: "Behind pace", exact: true }).click();
  await expect(reviewStatus).toContainText("3 of 6 compositions viewed");
  await expect(reviewStatus).toContainText("In progress (mobile)");
  await expect(reviewStatus).toContainText("Behind pace (mobile)");
  await expect(reviewStatus).not.toContainText("desktop");
  await expect(page.getByRole("checkbox")).toBeDisabled();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "In progress", exact: true }).click();
  await page.getByRole("button", { name: "On track", exact: true }).click();
  await expect(reviewStatus).toContainText("6 of 6 compositions viewed");
  await expect(reviewStatus).toContainText("All compositions viewed.");
  await expect(reviewStatus).not.toContainText("Still to view:");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Approve and create next chapter" })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "SCENES");
  await expect(
    page.getByRole("heading", { name: "Chapter 2 of 7" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Provider failure", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "reservation",
  );
  await page.getByRole("button", { name: "Retry unfinished work" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "BANNER");
  await page.getByRole("button", { name: "Save and leave" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume Season" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume Season" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "BANNER");
});

test("switches one full-width scene format at a time with safe slide motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "scenes", exact: true }).click();
  const desktop = page.locator('.guided-scene-pane[data-format="DESKTOP"]');
  const mobile = page.locator('.guided-scene-pane[data-format="MOBILE"]');
  const desktopButton = page.getByRole("button", {
    name: "Desktop",
    exact: true,
  });
  const mobileButton = page.getByRole("button", {
    name: "Mobile",
    exact: true,
  });
  await expect(desktopButton).toHaveAttribute("aria-pressed", "true");
  await expect(desktop).toBeVisible();
  await expect(mobile).toBeHidden();
  await mobileButton.press("Enter");
  await expect(mobileButton).toHaveAttribute("aria-pressed", "true");
  await expect(mobileButton).toBeFocused();
  await expect(mobile).toBeVisible();
  await expect(desktop).toHaveAttribute("inert", "");
  await expect(desktop).toHaveAttribute("aria-hidden", "true");
  await expect(desktop).toBeHidden();
  await expect(mobile).not.toHaveCSS("animation-duration", "0s");
  await page
    .getByRole("separator", { name: /phone preview width$/i })
    .press("End");
  await desktopButton.click();
  await mobileButton.click();
  await desktopButton.click();
  await expect(desktop).toBeVisible();
  await expect(mobile).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mobileButton.click();
  await expect(mobile).toHaveCSS("animation-name", "none");
  await expect(desktop).toBeHidden();
  await expect(
    page.getByRole("separator", { name: /phone preview width$/i }),
  ).toHaveAttribute("aria-valuenow", "430");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("fits entry on a small laptop or phone without horizontal scrolling", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Find my character" }),
  ).toBeInViewport();
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fits).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Find my character" }).click();
  await expect(
    page.getByRole("region", { name: "Recognized character" }),
  ).toBeVisible();
});

test("desktop scene review matches the dashboard scenery height at laptop and wide-screen sizes", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop scenery dimensions are checked in the desktop project.",
  );
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "scenes", exact: true }).click();
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 934 },
  ]) {
    await page.setViewportSize(viewport);
    const dashboardHeight = await page.evaluate(() => {
      // Render the production dashboard class so its actual CSS remains the reference.
      const reference = document.createElement("section");
      reference.className = "dashboard-v2-hero";
      reference.style.position = "absolute";
      reference.style.visibility = "hidden";
      document.body.append(reference);
      const height = reference.getBoundingClientRect().height;
      reference.remove();
      return height;
    });
    await expect(page.locator(".guided-desktop-scene-preview")).toBeVisible();
    const previewHeight = await page
      .locator(".guided-desktop-scene-preview")
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(previewHeight).toBeCloseTo(dashboardHeight, 1);
    const previewWidth = await page
      .locator(".guided-desktop-scene-preview")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(previewWidth).toBeGreaterThan(viewport.width * 0.8);
    await expect(page.locator(".guided-desktop-scene-preview img")).toHaveCSS(
      "object-fit",
      "cover",
    );
  }
});

test("banners reuse the desktop/mobile switch, slide and retained phone viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByText("Preview states · sample only").click();
  await page.getByRole("button", { name: "banner", exact: true }).click();
  const region = page.getByRole("region", {
    name: "Banner composition preview",
    exact: true,
  });
  const desktop = region.locator('.guided-scene-pane[data-format="DESKTOP"]');
  const mobile = region.locator('.guided-scene-pane[data-format="MOBILE"]');
  const mobileButton = page.getByRole("button", {
    name: "Mobile",
    exact: true,
  });
  const desktopButton = page.getByRole("button", {
    name: "Desktop",
    exact: true,
  });
  await expect(desktopButton).toHaveAttribute("aria-pressed", "true");
  await expect(desktop).toBeVisible();
  await expect(mobile).toBeHidden();
  await expect
    .poll(() =>
      desktop
        .locator("img")
        .evaluate((image) =>
          image instanceof HTMLImageElement ? image.currentSrc : "",
        ),
    )
    .toContain("levi-desktop-v2.webp");
  await expect(
    page.getByRole("button", {
      name: "Try another desktop banner",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try another phone banner", exact: true }),
  ).toHaveCount(0);
  await mobileButton.press("Enter");
  await expect(mobileButton).toHaveAttribute("aria-pressed", "true");
  await expect(mobileButton).toBeFocused();
  await expect(desktop).toHaveAttribute("inert", "");
  await expect(desktop).toBeHidden();
  await expect(mobile).toBeVisible();
  await expect(mobile).not.toHaveCSS("animation-duration", "0s");
  await expect(
    mobile.getByRole("heading", { name: "Levi Ackerman", exact: true }),
  ).toBeVisible();
  const widthHandle = page.getByRole("separator", {
    name: /phone preview width$/i,
  });
  await widthHandle.press("End");
  await desktopButton.click();
  await mobileButton.click();
  await desktopButton.click();
  await expect(desktop).toBeVisible();
  await expect(mobile).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mobileButton.click();
  await expect(mobile).toHaveCSS("animation-name", "none");
  await expect(desktop).toBeHidden();
  await expect(widthHandle).toHaveAttribute("aria-valuenow", "430");
  await expect(
    page.getByRole("button", {
      name: "Approve banners and continue",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("button", {
      name: "Approve banners and continue",
      exact: true,
    }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});
