import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "../src/features/domains/defaults/services/ensure-default-domains.service";

// Only records belonging to the account returned by this test's own signup are seeded.
// No production accounts or cross-user data are read or changed.
test("creative workspaces keep navigation, source inspection and responsive layouts usable", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(480_000);
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
    throw new Error("Visual fixtures require local PostgreSQL.");
  const email = `redesign-creative-${randomUUID()}@example.test`;
  const signup = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Creative workspace review",
      email,
      password: `Test!${randomUUID()}`,
    },
  });
  expect(signup.ok(), await signup.text()).toBe(true);
  const { user } = await signup.json();
  try {
    await ensureDefaultDomains(user.id);
    const domain = await prisma.domain.findUniqueOrThrow({
      where: { userId_slug: { userId: user.id, slug: "engineering" } },
      include: { activityTypes: true },
    });
    const project = await prisma.engineeringProject.create({
      data: {
        userId: user.id,
        name: "A calmer personal workspace",
        description: "Build a focused place for the work that matters.",
        context: "PERSONAL",
        repositoryUrl: "https://example.com/workspace",
        notes: "Keep the first version useful and easy to return to.",
      },
    });
    for (const day of [12, 16, 22])
      await prisma.session.create({
        data: {
          userId: user.id,
          domainId: domain.id,
          activityTypeId: domain.activityTypes[0].id,
          engineeringProjectId: project.id,
          engineeringContext: "PERSONAL",
          startedAt: new Date(`2026-09-${day}T09:00:00Z`),
          endedAt: new Date(`2026-09-${day}T10:30:00Z`),
          description: "Build the next useful piece",
          outcome: "A working version ready to try",
        },
      });
    await prisma.engineeringEvidence.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: "Made the project easier to return to",
        type: "FEATURE_COMPLETED",
        details:
          "A focused project summary now keeps the work and evidence together.",
        occurredAt: new Date("2026-09-22T11:00:00Z"),
      },
    });
    await prisma.userSeason.create({
      data: {
        userId: user.id,
        year: 2026,
        quarter: 3,
        title: "Room for the work",
        intention:
          "Build something useful, finish one piece of writing, and protect quiet mornings.",
        openingCompletedAt: new Date("2026-07-01T09:00:00Z"),
        stage: 4,
      },
    });
    const response = await page.request.post("/api/content/commands", {
      headers: { origin: baseURL! },
      data: {
        type: "CREATE_CONTENT",
        operationKey: randomUUID(),
        draft: {
          title: "Make room for the first move",
          purpose:
            "Help someone begin a meaningful piece of work with one small action.",
          audience: "People with more ideas than time",
          notes: "Use a concrete example.",
        },
        format: "SHORT_VERTICAL",
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const content = await response.json();
    await page.goto("/reviews/season/2026-07-01", { waitUntil: "networkidle" });
    await page
      .getByLabel("What deserves to stay with you?")
      .fill("Small, finished pieces made the work easier to return to.");
    await page
      .getByRole("button", { name: "Finalize review", exact: true })
      .click();
    await expect(page.getByText(/Finalized edition 1/)).toBeVisible();
    await page.waitForLoadState("networkidle");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      for (const [name, path] of [
        ["engineering", "/engineering?timeframe=year"],
        ["project", `/engineering/projects/${project.id}`],
        ["project-form", `/engineering/projects/${project.id}/edit`],
        ["evidence", "/engineering/evidence"],
        ["content-desk", "/content"],
        ["content-workspace", `/content/${content.contentId}`],
        [
          "script",
          `/content/${content.contentId}/variants/${content.workspace.variants[0].id}/script`,
        ],
        ["sessions", "/sessions"],
        ["reviews", "/reviews"],
        ["reading", "/reviews/season/2026-07-01"],
        ["finale", "/direction/seasons/2026/3/finale?replay=1"],
      ]) {
        await page.waitForLoadState("networkidle");
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main").first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        if (name === "sessions") {
          await page
            .getByRole("textbox", { name: "Search sessions" })
            .fill("no matching work");
          await expect(
            page.getByText("No matching sessions", { exact: true }),
          ).toBeVisible();
          await expect(page.getByTestId("session-row-trigger")).toHaveCount(0);
          await page
            .getByRole("button", { name: "Clear filters", exact: true })
            .click();
          await expect(page.getByTestId("session-row-trigger")).toHaveCount(3);
        }
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: info.outputPath(`${name}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
        const overflow = await page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .map((element) => ({
              tag: element.tagName,
              classes: element.className,
              right: element.getBoundingClientRect().right,
              width: element.getBoundingClientRect().width,
            }))
            .filter((element) => element.right > innerWidth + 1),
        );
        expect.soft(overflow, `${name} fits ${width}px`).toEqual([]);
        if (name === "reading") {
          const inspect = page
            .getByRole("button", { name: /Inspect sources for/ })
            .first();
          await inspect.click();
          const drawer = page.getByRole("dialog");
          await expect(drawer).toBeVisible();
          await expect(
            drawer.getByText("Build the next useful piece").first(),
          ).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`sources-${width}.png`),
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(drawer).not.toBeVisible();
          await expect(inspect).toBeFocused();
        }
        if (name === "finale") {
          await page
            .getByRole("button", { name: "3. What changed", exact: true })
            .click();
          await expect(page.locator("#finale-passage-2")).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`finale-results-${width}.png`),
            fullPage: true,
            animations: "disabled",
          });
          await page
            .getByRole("button", {
              name: "4. What you take with you",
              exact: true,
            })
            .click();
          await expect(
            page.getByRole("link", {
              name: "Return to the review",
              exact: true,
            }),
          ).toBeVisible();
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await deleteDisposableBrowserUser(user.id, email);
  }
});
