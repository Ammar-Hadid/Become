import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "../src/features/domains/defaults/services/ensure-default-domains.service";

// Only records belonging to the account returned by this test's own signup are seeded.
// No production accounts or cross-user data are read or changed.
test("creative details stay aligned across empty, populated and editing states", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(480_000);
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
    throw new Error("Visual fixtures require local PostgreSQL.");
  const email = `polish-creative-${randomUUID()}@example.test`;
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
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      for (const [name, path] of [
        ["engineering", "/engineering"],
        ["projects", "/engineering/projects"],
        ["evidence", "/engineering/evidence"],
        ["content", "/content"],
        ["sessions", "/sessions"],
        ["reviews", "/reviews"],
      ]) {
        await page.goto(path, { waitUntil: "networkidle" });
        await page.screenshot({
          path: info.outputPath(`empty-${name}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
    await prisma.domain.create({
      data: {
        userId: user.id,
        name: "Independent study and research",
        slug: "study",
        icon: "BookOpen",
        activityTypes: {
          create: [
            { name: "Reading and making useful connections", slug: "reading" },
          ],
        },
      },
    });
    const domain = await prisma.domain.findUniqueOrThrow({
      where: { userId_slug: { userId: user.id, slug: "engineering" } },
      include: { activityTypes: true },
    });
    const project = await prisma.engineeringProject.create({
      data: {
        userId: user.id,
        name: "A calmer personal workspace for notes, learning, and the projects that deserve another look",
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
          description:
            "Build the next useful piece and document the details that make it easier to maintain",
          outcome: "A working version ready to try",
        },
      });
    const evidence = await prisma.engineeringEvidence.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title:
          "Made the project easier to return to after a long break, with the important context kept beside the work",
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
          title:
            "Make room for the first move, even when the whole creative project feels too complicated to begin",
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
    const command = async (body: Record<string, unknown>) => {
      const result = await page.request.post("/api/content/commands", {
        headers: { origin: baseURL! },
        data: { ...body, operationKey: randomUUID() },
      });
      expect(result.ok(), await result.text()).toBe(true);
      const payload = await result.json();
      expect(payload.error).toBeNull();
      return payload;
    };
    const channel = await command({
      type: "SAVE_CHANNEL",
      draft: {
        name: "A quiet place for thoughtful creative work and experiments",
        platform: "YOUTUBE",
        account: "@one.deliberate.step.towards.more.creative.work",
      },
    });
    const publication = await command({
      type: "PUBLISH",
      contentId: content.contentId,
      variantId: content.workspace.variants[0].id,
      publications: [
        {
          channelId: channel.id,
          publishedTitle:
            "Make room for the first move, even when the whole creative project feels too complicated to begin",
          publishedOn: "2026-09-23",
          url: "https://www.youtube.com/shorts/abc123def45",
          placement:
            "The weekly series about building a sustainable creative practice",
        },
      ],
    });
    await command({
      type: "RECORD_OBSERVATION",
      contentId: content.contentId,
      publicationId: publication.workspace.variants[0].publications[0].id,
      draft: {
        observedAt: "2026-09-24T09:00:00Z",
        views: "1234567",
        likes: "12000",
        comments: "340",
        note: "A clear first step made the idea useful.",
      },
    });
    await command({
      type: "CREATE_CONTENT",
      draft: {
        title: "A companion piece about protecting time for meaningful work",
        purpose: "Keep the next idea close.",
        audience: "Creative people",
        notes: "",
      },
      format: "LONG_FORM",
    });

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
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      for (const [name, path] of [
        ["engineering", "/engineering?timeframe=year"],
        ["project", `/engineering/projects/${project.id}`],
        ["project-form", `/engineering/projects/${project.id}/edit`],
        ["projects", "/engineering/projects"],
        ["evidence-form", `/engineering/evidence/${evidence.id}/edit`],
        ["domain", "/domains/study"],
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
        if (
          width === 320 &&
          ![
            "projects",
            "project-form",
            "evidence-form",
            "content-workspace",
            "script",
            "finale",
          ].includes(name)
        )
          continue;
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
        if (
          name === "project-form" &&
          (await page.locator(".workspace-disclosure").getAttribute("open")) ===
            null
        ) {
          await page.locator(".workspace-disclosure summary").click();
        }
        if (name === "evidence")
          await page.getByTestId("evidence-record-trigger").first().click();
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
        if (name === "project-form" || name === "evidence-form") {
          for (const select of await page
            .locator(".become-native-select")
            .all()) {
            const geometry = await select.evaluate((el) => {
              const box = el.getBoundingClientRect();
              const icon = el.querySelector("svg")!.getBoundingClientRect();
              return {
                centerDifference: Math.abs(
                  icon.y + icon.height / 2 - box.y - box.height / 2,
                ),
                endInset: box.right - icon.right,
              };
            });
            expect
              .soft(
                geometry.centerDifference,
                `select chevron centered at ${width}px`,
              )
              .toBeLessThanOrEqual(1);
            expect
              .soft(
                geometry.endInset,
                `select chevron has end padding at ${width}px`,
              )
              .toBeGreaterThanOrEqual(12);
          }
        }
        if (name === "projects") {
          const controls = await page
            .locator(".engineering-list-toolbar .timeframe-switcher a")
            .all();
          const boxes = await Promise.all(
            controls.map((control) => control.boundingBox()),
          );
          expect
            .soft(
              boxes.every((box) => box && box.height >= 36),
              `project filters are full controls at ${width}px`,
            )
            .toBe(true);
        }
        if (name === "project") {
          const edit = page
            .locator(".engineering-record-row .text-link")
            .first();
          const geometry = await edit.evaluate((el) => {
            const box = el.getBoundingClientRect();
            const icon = el.querySelector("svg")!.getBoundingClientRect();
            return {
              centerDifference: Math.abs(
                icon.y + icon.height / 2 - box.y - box.height / 2,
              ),
              iconRight: icon.right - box.right,
            };
          });
          expect
            .soft(
              geometry.centerDifference,
              `evidence edit label and icon share one line at ${width}px`,
            )
            .toBeLessThanOrEqual(1);
          expect.soft(geometry.iconRight).toBeLessThanOrEqual(0);
        }
        if (name === "content-desk") {
          await page
            .getByRole("button", { name: "Start content", exact: true })
            .first()
            .click();
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`create-dialog-${width}.png`),
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toHaveCount(0);
        }
        if (name === "content-workspace") {
          for (const text of await page
            .locator(
              ".content-release-identity strong, .content-release-metrics dd",
            )
            .all()) {
            const clipped = await text.evaluate(
              (el) => el.scrollWidth > el.clientWidth + 1,
            );
            expect
              .soft(
                clipped,
                `release labels and values fit their columns at ${width}px`,
              )
              .toBe(false);
          }
          await page.locator(".content-releases").screenshot({
            path: info.outputPath(`release-row-${width}.png`),
            animations: "disabled",
          });
          await page
            .getByRole("button", { name: "Record results", exact: true })
            .click();
          await expect(
            page.getByRole("dialog", {
              name: "What does this release show now?",
            }),
          ).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`results-dialog-${width}.png`),
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toHaveCount(0);
          for (const [dialogName, buttonName] of [
            ["variant", "Add a variant"],
            ["release", "Record a release"],
          ]) {
            await page
              .getByRole("button", { name: buttonName, exact: true })
              .click();
            await expect(
              page.locator('dialog[open], [role="dialog"]'),
            ).toBeVisible();
            await page.screenshot({
              path: info.outputPath(`${dialogName}-dialog-${width}.png`),
              animations: "disabled",
            });
            await page.keyboard.press("Escape");
            await expect(
              page.locator('dialog[open], [role="dialog"]'),
            ).toHaveCount(0);
          }
        }
        if (name === "sessions") {
          await page.getByTestId("session-row-trigger").first().click();
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`session-drawer-${width}.png`),
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toHaveCount(0);
        }
        if (name === "reading") {
          const inspect = page
            .getByRole("button", { name: /Inspect sources for/ })
            .first();
          await inspect.click();
          const drawer = page.locator('dialog[open], [role="dialog"]');
          await expect(drawer).toBeVisible();
          await expect(
            drawer
              .getByText(
                "Build the next useful piece and document the details that make it easier to maintain",
              )
              .first(),
          ).toBeVisible();
          await page.screenshot({
            path: info.outputPath(`sources-${width}.png`),
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(
            page.locator('dialog[open], [role="dialog"]'),
          ).toHaveCount(0);
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
