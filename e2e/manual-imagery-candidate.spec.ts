import { expect, test, type Page } from "@playwright/test";
const route = "/manual-season-imagery-candidate";
const desktop =
  "public/design-review/character-workspace-v3/levi-desktop-v2.webp";
const mobile = "public/design-review/character-workspace-v3/levi-phone-v2.webp";
const portrait = "public/design-review/character-workspace-v3/levi-avatar.webp";
async function openControls(page: Page) {
  await page.getByText("Preview states · sample only", { exact: true }).click();
}
async function reviewChapter(page: Page) {
  const review = page.locator(".manual-art-review");
  for (const pace of ["On track", "In progress", "Behind pace"]) {
    await review.getByRole("button", { name: pace, exact: true }).click();
    await review.getByRole("button", { name: "Mobile", exact: true }).click();
    await review.getByRole("button", { name: "Desktop", exact: true }).click();
  }
  await review.getByRole("checkbox").check();
  await review.getByRole("button", { name: /^Approve / }).click();
}

test("banner uploads validate orientation, persist and copy cached prompt samples", async ({
  page,
}) => {
  const errors: string[] = [],
    api: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      api.push(request.url());
  });
  await page.goto(route);
  await expect(page).toHaveTitle("Manual Season imagery preview · Become");
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await expect(page.locator(".become-artwork-upload")).toHaveCount(1);
  await page.locator('input[type="file"]').setInputFiles(mobile);
  await expect(
    page.locator('.become-artwork-upload [role="alert"]'),
  ).toContainText("wide desktop");
  await page.locator('input[type="file"]').setInputFiles(desktop);
  await expect(
    page.getByRole("img", { name: "Desktop banner · uploaded preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review banners", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Generate prompt", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Your image prompt" });
  await expect(dialog).toContainText("21:9");
  await expect(dialog).toContainText("Hand-authored preview sample");
  await dialog
    .getByRole("button", { name: "Copy prompt", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    /Prompt copied|Copy failed/,
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page
    .getByRole("button", { name: "View & copy prompt", exact: true })
    .click();
  await expect(dialog).toContainText("9:16");
  await page.keyboard.press("Escape");
  await page.locator('input[type="file"]').setInputFiles(mobile);
  await expect(
    page.getByRole("button", { name: "Review banners", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Mobile banner · uploaded preview" }),
  ).toBeVisible();
  await openControls(page);
  await expect(
    page.getByText(/Sample prompt-writing batches this visit:/),
  ).toContainText("0");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
});

test("manual scenes expose three slots, retain a separate attempt and restore chapter progress", async ({
  page,
}) => {
  await page.goto(route);
  await openControls(page);
  await page
    .getByRole("button", {
      name: "Manual progress through Chapter 4",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chapter 5 of 7", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".become-artwork-upload")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Review Chapter 5", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  const arrangement = await page
    .locator(".imagery-method-switch-dialog .become-dialog__footer")
    .evaluate((footer) => {
      const [keep, remove] = Array.from(footer.querySelectorAll("button")).map(
        (button) => button.getBoundingClientRect(),
      );
      return {
        desktop: innerWidth >= 1024,
        sameRow: Math.abs(keep.top - remove.top) < 1,
        orderedColumns: keep.right <= remove.left,
        stacked: keep.bottom <= remove.top,
        overflow: footer.scrollWidth > footer.clientWidth,
      };
    });
  expect(arrangement.overflow).toBe(false);
  expect(
    arrangement.desktop
      ? arrangement.sameRow && arrangement.orderedColumns
      : arrangement.stacked,
  ).toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Keep progress until onboarding finishes",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chapter 1 of 7", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".manual-imagery-workspace")).toContainText(
    "other attempt kept",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("resume at Chapter 5");
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Keep progress until onboarding finishes",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chapter 5 of 7", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.locator(".become-artwork-upload")).toHaveCount(3);
  await expect(page.locator(".manual-imagery-workspace")).toContainText(
    "Still needed:",
  );
  await openControls(page);
  await page
    .getByRole("button", {
      name: "Fill chapter with sample images",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Review Chapter 5", exact: true })
    .click();
  await reviewChapter(page);
  await expect(
    page.getByRole("heading", { name: "Chapter 6 of 7", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete progress now", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText("will resume");
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Keep progress until onboarding finishes",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chapter 1 of 7", exact: true }),
  ).toBeVisible();
});

test("prompt-writing and upload failures preserve work and allow retries", async ({
  page,
}) => {
  await page.goto(route);
  await openControls(page);
  await page
    .getByRole("button", { name: "Fail next prompt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate prompt", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('[role="alert"]')).toContainText(
    "Saved prompts and artwork are preserved",
  );
  await dialog
    .getByRole("button", { name: "Retry prompt", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Copy prompt", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Fail uploads", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(desktop);
  await expect(
    page.locator('.become-artwork-upload [role="alert"]'),
  ).toContainText("existing image is preserved");
  await page
    .getByRole("button", { name: "Restore uploads", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles(desktop);
  await expect(
    page.getByRole("img", { name: "Desktop banner · uploaded preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await expect(page.locator(".become-ambient-light")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".become-ambient-light__field")
      .evaluate(
        (element) => getComputedStyle(element, "::before").animationName,
      ),
  ).toBe("none");
});

test("unused kept attempts survive until all chapters are reviewed and sample onboarding finishes", async ({
  page,
}) => {
  await page.goto(route);
  await openControls(page);
  await page
    .getByRole("button", {
      name: "Manual progress through Chapter 4",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Keep progress until onboarding finishes",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Change creation method", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Keep progress until onboarding finishes",
      exact: true,
    })
    .click();
  for (const chapter of [5, 6, 7]) {
    await expect(
      page.getByRole("heading", {
        name: `Chapter ${chapter} of 7`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Fill chapter with sample images",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: `Review Chapter ${chapter}`, exact: true })
      .click();
    await reviewChapter(page);
  }
  await expect(
    page.getByRole("heading", {
      name: "Your complete artwork pack is ready.",
      exact: true,
    }),
  ).toBeVisible();
  async function attempts() {
    return page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("become-artwork-candidates", 1);
        request.onsuccess = () => resolve(request.result);
      });
      const value = await new Promise<{ attempts: Record<string, unknown> }>(
        (resolve) => {
          const request = db
            .transaction("drafts", "readonly")
            .objectStore("drafts")
            .get("become-manual-imagery-preview-v1");
          request.onsuccess = () => resolve(request.result);
        },
      );
      db.close();
      return Object.keys(value.attempts).sort();
    });
  }
  expect(await attempts()).toEqual(["AI", "MANUAL"]);
  await page
    .getByRole("button", { name: "Complete sample onboarding", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Preview onboarding complete.",
      exact: true,
    }),
  ).toBeVisible();
  expect(await attempts()).toEqual(["MANUAL"]);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Preview onboarding complete.",
      exact: true,
    }),
  ).toBeVisible();
});

test("recipe library scopes 42 scene recipes and protects unsaved edits", async ({
  page,
}) => {
  const errors: string[] = [],
    api: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      api.push(request.url());
  });
  await page.goto("/image-prompt-library-candidate");
  await expect(page).toHaveTitle("Image prompt library preview · Become");
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose chapter", exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Chapter 7", exact: true })
    .click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "Behind pace", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Chapter 7 · Behind pace · mobile",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".image-direction-template")).toHaveCount(1);
  await expect(page.locator(".recipe-library-editor")).toContainText("9:16");
  await page
    .getByRole("button", { name: "Edit prompt body", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Chapter 7 · Behind pace · mobile prompt body",
  });
  await editor.fill(
    "Write a peaceful coastal scene for the approved character. Keep the identity and lighting consistent across this chapter.",
  );
  await page.getByRole("button", { name: "Banners", exact: true }).click();
  await expect(
    page.locator('.recipe-library-workspace > [role="alert"]'),
  ).toContainText("Save or discard");
  await expect(
    page.getByRole("heading", {
      name: "Chapter 7 · Behind pace · mobile",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Save.*draft/i }).click();
  await expect(page.locator(".image-direction-template")).toContainText(
    "Draft v2",
  );
  await page
    .getByRole("button", { name: "Publish saved draft", exact: true })
    .click();
  await expect(page.locator(".image-direction-template")).toContainText(
    "Published v2",
  );
  await page
    .getByRole("button", { name: "Preview with a Season", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "peaceful coastal scene",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "No text-model or image-provider call",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose chapter", exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Chapter 7", exact: true })
    .click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "Behind pace", exact: true }).click();
  await expect(page.locator(".image-direction-template")).toContainText(
    "Published v2",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
});

test("separate portrait upload and keyboard crop persist across refresh", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "Create sample banners", exact: true })
    .click();
  await page.locator(".manual-art-review").getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Approve banners and continue",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles(portrait);
  await page
    .getByRole("button", { name: "Review portrait", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adjust portrait", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Adjust Levi Ackerman's profile picture",
    exact: true,
  });
  const zoom = dialog.getByRole("slider", { name: "Zoom", exact: true });
  await zoom.press("ArrowRight");
  await zoom.press("ArrowRight");
  const value = await zoom.inputValue();
  await dialog
    .getByRole("button", { name: "Use this picture", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Adjust portrait", exact: true })
    .click();
  await expect(
    dialog.getByRole("slider", { name: "Zoom", exact: true }),
  ).toHaveValue(value);
  await dialog.locator('input[type="file"]').setInputFiles(portrait);
  await dialog
    .getByRole("button", { name: "Use this picture", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.locator(".manual-art-review").getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Approve profile and choose scene creation",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "How will you create your Season scenes?",
      exact: true,
    }),
  ).toBeVisible();
});

test("prompt views use the shared drawer and sequential Living Ink with pause and reduced motion", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate prompt", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Your image prompt",
    exact: true,
  });
  await expect(drawer).toHaveClass(/become-drawer/);
  await expect(page.locator(".become-dialog")).toHaveCount(0);
  const paragraphs = drawer.locator(".living-ink-paragraph");
  await expect(paragraphs).toHaveCount(5);
  const actions = await drawer
    .locator(".imagery-prompt-actions")
    .evaluate((row) => {
      const [copy, regenerate] = Array.from(row.querySelectorAll("button")).map(
        (button) => button.getBoundingClientRect(),
      );
      return {
        desktop: innerWidth >= 1024,
        sameRow: Math.abs(copy.top - regenerate.top) < 1,
        sideBySide: copy.right <= regenerate.left,
        stacked: copy.bottom <= regenerate.top,
        overflow: row.scrollWidth > row.clientWidth,
      };
    });
  expect(actions.overflow).toBe(false);
  expect(
    actions.desktop ? actions.sameRow && actions.sideBySide : actions.stacked,
  ).toBe(true);
  await expect(paragraphs.nth(1)).toHaveAttribute("data-pending", "true");
  await drawer
    .getByRole("button", { name: "Pause motion", exact: true })
    .click();
  await expect(
    drawer.getByRole("button", { name: "Resume motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(paragraphs.first()).toHaveAttribute("data-running", "false");
  await drawer
    .getByRole("button", { name: "Copy prompt", exact: true })
    .click();
  await expect(drawer.getByRole("status")).toContainText(
    /Prompt copied|Copy failed/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(drawer.locator(".living-ink-copy")).toHaveAttribute(
    "data-complete",
    "true",
  );
  await expect(drawer.locator(".living-ink-word")).toHaveCount(0);
  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.round(bounds!.x + bounds!.width)).toBe(
    await page.evaluate(() => innerWidth),
  );
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "View & copy prompt", exact: true }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .getByRole("button", { name: "View & copy prompt", exact: true })
    .press("Enter");
  await expect(drawer.locator(".living-ink-copy")).toHaveAttribute(
    "data-armed",
    "true",
  );
  await expect(drawer.locator(".living-ink-paragraph").nth(1)).toHaveAttribute(
    "data-pending",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page
    .getByRole("button", { name: "View & copy prompt", exact: true })
    .click();
  await expect(drawer).toHaveClass(/become-drawer/);
  await expect(drawer).toContainText("9:16");
});
