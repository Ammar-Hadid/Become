import { expect, test, type Page } from "./utils/browser-test.util";

async function createAccount(page: Page) {
  const email = `engineering-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByTestId("name-input").fill("Engineering Explorer");
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill("become-test-password");
  await page.getByTestId("auth-submit").click();
  await expect(
    page.getByRole("heading", { name: /Engineering/ }),
  ).toBeVisible();
}

async function openStartTimer(page: Page) {
  await page.locator('[data-testid="start-timer-trigger"]:visible').click();
  await page.getByRole("button", { name: "Engineering", exact: true }).click();
}

test("engineering sessions keep their own context with or without a project", async ({
  page,
}) => {
  await createAccount(page);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Become");
  await page
    .getByTestId("engineering-project-context")
    .selectOption("PERSONAL");
  await page
    .getByTestId("engineering-project-live-url")
    .fill("https://become.example.com");
  const technologySearch = page.getByTestId("engineering-technology-search");
  await technologySearch.fill("TypeScript");
  await page.getByTestId("engineering-technology-option-typescript").click();
  await technologySearch.fill("React.js");
  await page.getByTestId("engineering-technology-option-react").click();
  await technologySearch.fill("HTMX");
  await page.getByTestId("add-custom-technology").click();
  await expect(page.getByTestId("selected-technology")).toHaveCount(3);
  await page.getByTestId("save-engineering-project").click();
  await expect(
    page.getByRole("link", { name: /Live project/ }),
  ).toHaveAttribute("href", "https://become.example.com");
  await expect(page.getByLabel("Technology stack")).toContainText("React");
  await expect(page.getByLabel("Technology stack")).toContainText("TypeScript");
  await expect(page.getByLabel("Technology stack")).toContainText("HTMX");
  await expect(
    page.getByTestId("engineering-project-detail-context"),
  ).toHaveText("Personal");
  await expect(page).toHaveURL(/\/engineering\/projects\/(?!new$)[^/]+$/);
  const projectUrl = new URL(page.url()).pathname;

  await page.goto("/");
  await openStartTimer(page);
  await page.getByTestId("activity-select").selectOption({ label: "Coding" });
  await page
    .getByTestId("engineering-project-select")
    .selectOption({ label: "Become" });
  await expect(page.getByTestId("engineering-context-select")).toHaveValue(
    "PERSONAL",
  );
  await page.getByTestId("engineering-context-select").selectOption("UNI");
  await page
    .getByTestId("session-description")
    .fill("Build the Engineering workspace");
  await page.getByTestId("confirm-start-timer").click();
  await expect(page.getByTestId("dashboard-active-session")).toContainText(
    "Build the Engineering workspace",
  );
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-testid="active-timer-trigger"]:visible')
          .getAttribute("data-elapsed-seconds"),
      ),
    )
    .toBeGreaterThan(0);

  await page.reload();
  await page.getByTestId("dashboard-active-session").click();
  await expect(
    page.getByTestId("completion-engineering-context-select"),
  ).toHaveValue("UNI");
  await expect(
    page.getByTestId("completion-engineering-project-select"),
  ).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Record concrete evidence" }).click();
  await page
    .getByTestId("engineering-evidence-type-select")
    .selectOption("FEATURE_COMPLETED");
  await page
    .getByTestId("engineering-evidence-title")
    .fill("Engineering workspace completed");
  await page.getByTestId("confirm-stop-timer").click();

  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Build the Engineering workspace" })
    .click();
  await expect(
    page.getByTestId("session-detail-engineering-context"),
  ).toContainText("Uni");
  await expect(
    page.getByTestId("session-detail-engineering-project"),
  ).toContainText("Become");
  await expect(
    page.getByTestId("session-detail-engineering-evidence"),
  ).toContainText("Engineering workspace completed");
  await page.getByRole("button", { name: "Close session details" }).click();

  await page.goto(projectUrl);
  await expect(page.getByRole("heading", { name: "Become" })).toBeVisible();
  await expect(page.getByLabel("Technology stack")).toContainText("HTMX");
  await expect(page.getByText("Engineering workspace completed")).toBeVisible();
  await expect(
    page
      .getByTestId("session-row-trigger")
      .filter({ hasText: "Build the Engineering workspace" }),
  ).toBeVisible();

  await page.locator(`a[href="${projectUrl}/edit"]`).click();
  await expect(page.getByTestId("selected-technology")).toHaveCount(3);
  await page
    .getByTestId("engineering-project-context")
    .selectOption("PROFESSIONAL");
  await page.getByRole("button", { name: "Remove HTMX" }).click();
  await page.getByTestId("engineering-technology-search").fill("HTMX");
  await page.getByTestId("engineering-technology-option-htmx").click();
  await expect(page.getByTestId("add-custom-technology")).toHaveCount(0);
  await page.getByTestId("save-engineering-project").click();
  await expect(page.getByLabel("Technology stack")).toContainText("HTMX");
  await expect(
    page.getByTestId("engineering-project-detail-context"),
  ).toHaveText("Professional");
  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Build the Engineering workspace" })
    .click();
  await expect(
    page.getByTestId("session-detail-engineering-context"),
  ).toContainText("Uni");
  await page.getByRole("button", { name: "Close session details" }).click();

  await page.goto("/");
  await openStartTimer(page);
  await page.getByTestId("activity-select").selectOption({ label: "Learning" });
  await page.getByTestId("engineering-context-select").selectOption("UNI");
  await expect(page.getByTestId("engineering-project-select")).toHaveValue("");
  await page
    .getByTestId("session-description")
    .fill("Study distributed systems");
  await page.getByTestId("confirm-start-timer").click();
  await page.getByTestId("dashboard-active-session").click();
  await expect(
    page.getByTestId("completion-engineering-context-select"),
  ).toHaveValue("UNI");
  await expect(
    page.getByTestId("completion-engineering-project-select"),
  ).toHaveValue("");
  await page.getByTestId("confirm-stop-timer").click();

  await page
    .getByTestId("session-row-trigger")
    .filter({ hasText: "Study distributed systems" })
    .click();
  await expect(
    page.getByTestId("session-detail-engineering-context"),
  ).toContainText("Uni");
  await expect(
    page.getByTestId("session-detail-engineering-project"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close session details" }).click();

  await page.goto("/engineering");
  const projectContextAnalytics = page
    .locator(".engineering-breakdown")
    .filter({ hasText: "Projects worked on by context" });
  await expect(projectContextAnalytics).toContainText("Professional");
  await expect(projectContextAnalytics).toContainText("1 project");

  await page.goto(projectUrl);
  await page.getByRole("button", { name: /Archive/ }).click();
  await expect(page).toHaveURL(/\/engineering\/projects$/);
  await expect(
    page.getByTestId("engineering-project-row").filter({ hasText: "Become" }),
  ).toHaveCount(0);

  await openStartTimer(page);
  await expect(
    page.getByTestId("engineering-project-select").locator("option", {
      hasText: "Become",
    }),
  ).toHaveCount(0);
});

test("project forms protect unsaved changes without blocking successful saves", async ({
  page,
}) => {
  await createAccount(page);

  await page.goto("/engineering/projects/new");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/engineering\/projects$/);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Temporary");
  await page.getByTestId("engineering-project-name").fill("");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/engineering\/projects$/);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Protected project");
  const dismissedCancel = waitForDialog(page, "confirm", false);
  await page.getByRole("link", { name: "Cancel" }).click();
  await dismissedCancel;
  await expect(page).toHaveURL(/\/engineering\/projects\/new$/);
  await expect(page.getByTestId("engineering-project-name")).toHaveValue(
    "Protected project",
  );

  const acceptedCancel = waitForDialog(page, "confirm", true);
  await page.getByRole("link", { name: "Cancel" }).click();
  await acceptedCancel;
  await expect(page).toHaveURL(/\/engineering\/projects$/);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Internal guard");
  const dismissedNavigation = waitForDialog(page, "confirm", false);
  await page.locator('a[href="/"]:visible').first().click();
  await dismissedNavigation;
  await expect(page).toHaveURL(/\/engineering\/projects\/new$/);

  const acceptedNavigation = waitForDialog(page, "confirm", true);
  await page.locator('a[href="/"]:visible').first().click();
  await acceptedNavigation;
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Back guard");
  const dismissedBack = waitForDialog(page, "confirm", false);
  await page.evaluate(() => window.history.back());
  await dismissedBack;
  await expect(page).toHaveURL(/\/engineering\/projects\/new$/);

  const acceptedBack = waitForDialog(page, "confirm", true);
  await page.evaluate(() => window.history.back());
  await acceptedBack;
  await expect(page).not.toHaveURL(/\/engineering\/projects\/new$/);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Reload guard");
  const acceptedReload = waitForDialog(page, "beforeunload", true);
  await page.reload();
  await acceptedReload;
  await expect(page.getByTestId("engineering-project-name")).toHaveValue("");

  await page.getByTestId("engineering-project-name").fill("Saved project");
  await page
    .getByTestId("engineering-project-context")
    .selectOption("PROFESSIONAL");
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(/\/engineering\/projects\/(?!new$)[^/]+$/);
  await expect(
    page.getByTestId("engineering-project-detail-context"),
  ).toHaveText("Professional");
});

test("evidence history expands independently and keeps record actions distinct", async ({
  page,
}) => {
  await createAccount(page);

  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill("Release platform");
  await page
    .getByTestId("engineering-project-context")
    .selectOption("PROFESSIONAL");
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(/\/engineering\/projects\/(?!new$)[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Release platform" }),
  ).toBeVisible();

  await page.goto("/engineering/evidence/new");
  await page
    .getByTestId("engineering-evidence-type-select")
    .selectOption("DEPLOYMENT");
  await page
    .getByTestId("engineering-evidence-title")
    .fill("Released the migration pipeline");
  await page.getByLabel(/^Project/).selectOption({ label: "Release platform" });
  await page
    .getByLabel(/^Details/)
    .fill(
      "Moved the production schema through the new deployment path.\n\nVerified rollback behavior and documented the recovery sequence at https://example.com/a/very/long/path/that/must/remain/inside/the/readable/evidence/measure/without/creating/horizontal/overflow.",
    );
  await page.getByTestId("save-engineering-evidence").click();
  await expect(page).toHaveURL(/\/engineering\/evidence$/);
  await expect(page.getByText("Released the migration pipeline")).toBeVisible();

  await page.goto("/engineering/evidence/new");
  await page
    .getByTestId("engineering-evidence-type-select")
    .selectOption("CONCEPT_LEARNED");
  await page
    .getByTestId("engineering-evidence-title")
    .fill("Understood transaction isolation boundaries");
  await page
    .getByLabel(/^Details/)
    .fill(
      "Captured the difference between repeatable reads and serializable work.\n\nApplied it to the reference-data synchronization flow.",
    );
  await page.getByTestId("save-engineering-evidence").click();
  await expect(page).toHaveURL(/\/engineering\/evidence$/);
  await expect(
    page.getByText("Understood transaction isolation boundaries"),
  ).toBeVisible();

  const records = page.getByTestId("evidence-record");
  await expect(records).toHaveCount(2);

  const learnedRecord = records.filter({
    hasText: "Understood transaction isolation boundaries",
  });
  const releasedRecord = records.filter({
    hasText: "Released the migration pipeline",
  });
  const learnedDetails = learnedRecord.getByTestId("evidence-record-details");
  const releasedDetails = releasedRecord.getByTestId("evidence-record-details");

  await expect(learnedDetails).toBeHidden();
  await expect(releasedDetails).toBeHidden();
  await expect(learnedRecord).toContainText("Concept learned");
  await expect(learnedRecord).toContainText("Independent record");
  await expect(releasedRecord).toContainText("Deployment");
  await expect(releasedRecord).toContainText("Release platform");

  const learnedTrigger = learnedRecord.getByTestId("evidence-record-trigger");
  await learnedTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(learnedDetails).toBeVisible();
  await expect(learnedDetails).toContainText(
    "Applied it to the reference-data synchronization flow.",
  );

  await releasedRecord.getByTestId("evidence-record-trigger").click();
  await expect(learnedDetails).toBeVisible();
  await expect(releasedDetails).toBeVisible();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);

  await learnedTrigger.focus();
  await page.keyboard.press(" ");
  await expect(learnedDetails).toBeHidden();
  await expect(releasedDetails).toBeVisible();

  const editLink = releasedRecord.getByTestId("evidence-edit-link");
  await expect(editLink).toHaveAttribute(
    "href",
    /\/engineering\/evidence\/.+\/edit/,
  );
  await editLink.click();
  await expect(page).toHaveURL(/\/engineering\/evidence\/.+\/edit$/);
  await expect(page.getByTestId("engineering-evidence-title")).toHaveValue(
    "Released the migration pipeline",
  );
});

function waitForDialog(
  page: Page,
  type: "confirm" | "beforeunload",
  accept: boolean,
) {
  return new Promise<void>((resolve, reject) => {
    page.once("dialog", async (dialog) => {
      try {
        expect(dialog.type()).toBe(type);
        if (type === "confirm") {
          expect(dialog.message()).toContain("unsaved project changes");
        }
        if (accept) await dialog.accept();
        else await dialog.dismiss();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}
