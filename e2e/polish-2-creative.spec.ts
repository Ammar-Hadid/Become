import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "../src/features/domains/defaults/services/ensure-default-domains.service";

// Only records belonging to the account returned by this test's own signup are seeded.
// No production accounts or cross-user data are read or changed.
test("creative optional controls remain usable at intermediate widths", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(12_000);
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
        technologies: {
          create: {
            technology: {
              create: {
                userId: user.id,
                name: "InternalCustomerResearchDataSynchronizationFramework",
                slug: "internal-customer-research-data-synchronization-framework",
                category: "OTHER",
              },
            },
          },
        },
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

    const observations: unknown[] = [];
    const capture = async (name: string, width: number) => {
      await page.screenshot({
        path: info.outputPath(`${name}-${width}.png`),
        fullPage: ![
          "platform-menu",
          "release-expanded",
          "results-validation",
          "document-menu",
          "session-time",
          "session-time-entry",
          "review-source",
        ].includes(name),
        animations: "disabled",
      });
      const layout = await page.evaluate(() => ({
        pageWidth: document.documentElement.scrollWidth,
        overflows: [
          ...document.querySelectorAll(
            'main *, [role="dialog"] *, dialog[open] *, [role="listbox"] *, [role="menu"] *',
          ),
        ]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return (
              box.width > 0 &&
              box.height > 0 &&
              style.visibility !== "hidden" &&
              (box.right > innerWidth + 1 || box.left < -1)
            );
          })
          .map((el) => ({
            tag: el.tagName,
            classes: el.className,
            text: el.textContent?.slice(0, 90),
            right: el.getBoundingClientRect().right,
          }))
          .slice(-15),
      }));
      observations.push({ name, width, layout });
      expect
        .soft(layout.pageWidth, `${name} page fits ${width}px`)
        .toBeLessThanOrEqual(width + 1);
      expect
        .soft(layout.overflows, `${name} controls fit ${width}px`)
        .toEqual([]);
    };
    page.on("dialog", (dialog) => void dialog.accept());
    for (const width of [390, 820, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/engineering/projects/${project.id}/edit`);
      const tech = page.getByTestId("engineering-technology-search");
      await tech.fill("InternalCustomerResearchWorkflowSynchronizationToolkit");
      await expect(page.getByTestId("add-custom-technology")).toBeVisible();
      await capture("technology-option", width);
      await page.getByTestId("add-custom-technology").click();
      await page.getByTestId("engineering-project-name").focus();
      await capture("technology-selected", width);
      for (const remove of await page
        .getByTestId("selected-technology")
        .getByRole("button")
        .all())
        await remove.click({ trial: true });
      await page
        .getByRole("button", {
          name: "Remove InternalCustomerResearchWorkflowSynchronizationToolkit",
          exact: true,
        })
        .click();
      await expect(page.getByTestId("selected-technology")).toHaveCount(1);
      const optional = page.locator(".workspace-disclosure");
      await page
        .getByTestId("engineering-project-live-url")
        .fill("invalid address");
      await optional.locator("summary").click();
      await page.getByTestId("save-engineering-project").click();
      await expect(optional).toHaveAttribute("open", "");
      await capture("project-validation", width);
      await page.goto(`/engineering/projects/${project.id}`);
      await expect(page.getByLabel("Technology stack")).toBeVisible();
      await capture("technology-stack", width);
      await page.goto(`/engineering/evidence/${evidence.id}/edit`);
      await expect(
        page.getByTestId("engineering-evidence-title"),
      ).toBeVisible();
      await capture("evidence-context", width);

      await page.goto(`/content/${content.contentId}`);
      await page
        .getByRole("button", { name: "Record a release", exact: true })
        .click();
      const release = page.getByRole("dialog");
      await release.locator(".content-channel-choice").first().click();
      await release
        .getByRole("button", { name: "Add a channel or account", exact: true })
        .click();
      await release.locator(".select-trigger").click();
      await expect(
        page.getByRole("menu", { name: "Platform", exact: true }),
      ).toBeVisible();
      await capture("platform-menu", width);
      await page
        .getByRole("menuitemradio", { name: "Another platform", exact: true })
        .click();
      await release
        .getByRole("textbox", { name: "Channel name", exact: true })
        .fill("A second thoughtful channel");
      await release
        .getByRole("textbox", { name: "Platform name", exact: true })
        .fill("Independent newsletter and subscriber community");
      await capture("release-expanded", width);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Record results", exact: true })
        .click();
      const results = page.getByRole("dialog");
      await results
        .locator('input[name="views"]')
        .fill("9999999999999999999999999999");
      await results
        .getByRole("button", { name: "Record results", exact: true })
        .click();
      await expect(results.getByRole("alert")).toBeVisible();
      await capture("results-validation", width);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.goto(
        `/content/${content.contentId}/variants/${content.workspace.variants[0].id}/script`,
      );
      await expect(page.locator(".tiptap").first()).toBeVisible();
      await page.getByRole("button", { name: "Document", exact: true }).click();
      await expect(
        page.getByRole("menu", { name: "Document", exact: true }),
      ).toBeVisible();
      await capture("document-menu", width);
      await page.keyboard.press("Escape");

      await page.goto("/sessions");
      await page.getByTestId("session-row-trigger").first().click();
      const session = page.getByRole("dialog");
      await session
        .getByRole("button", { name: "Edit recorded time", exact: true })
        .click();
      await capture("session-time", width);
      await session
        .getByRole("spinbutton", { name: "Hours", exact: true })
        .press("Enter");
      await session.getByTestId("session-duration-hours-input").fill("12");
      await session.getByTestId("session-duration-hours-input").press("Enter");
      await capture("session-time-entry", width);
      await session
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.goto("/domains/study");
      await expect(
        page.getByRole("heading", {
          name: "Independent study and research",
          exact: true,
        }),
      ).toBeVisible();
      await capture("custom-domain", width);
    }
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto("/reviews/season/2026-07-01");
    await expect(
      page.getByLabel("What deserves to stay with you?"),
    ).toBeVisible();
    await page
      .getByLabel("What deserves to stay with you?")
      .fill("Small, finished pieces made the work easier to return to.");
    await page
      .getByRole("button", { name: "Finalize review", exact: true })
      .click();
    await expect(page.getByText(/Finalized edition 1/)).toBeVisible();
    const inspect = page
      .getByRole("button", { name: /Inspect sources for/ })
      .first();
    await inspect.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await capture("review-source", 820);
    await page.keyboard.press("Escape");
    await expect(inspect).toBeFocused();
    await page.goto("/direction/seasons/2026/3/finale?replay=1");
    await page
      .getByRole("button", { name: "3. What changed", exact: true })
      .click();
    await expect(page.locator("#finale-passage-2")).toBeVisible();
    await capture("finale-results", 820);
    await page
      .getByRole("button", { name: "4. What you take with you", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Return to the review", exact: true }),
    ).toBeVisible();
    await capture("finale-closing", 820);
    writeFileSync(
      info.outputPath("layout-observations.json"),
      JSON.stringify(observations, null, 2),
    );
  } finally {
    await page.close();
    await deleteDisposableBrowserUser(user.id, email);
  }
});
