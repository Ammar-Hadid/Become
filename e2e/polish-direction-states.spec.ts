import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { DateTime } from "luxon";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";

// A disposable account lets long labels and populated details expose layout defects.
test("Direction secondary controls stay readable and reachable", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const email = `polish-direction-states-${randomUUID()}@example.test`;
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: {
      name: "A person with a deliberately longer full display name",
      email,
      password: `Audit!${randomUUID()}`,
    },
  });
  expect(signup.ok()).toBe(true);
  const { user } = await signup.json();
  const diagnostics: unknown[] = [];
  try {
    const now = DateTime.now().setZone("Europe/Amsterdam");
    await page.request.post("/api/direction/cots", {
      headers: { origin: baseURL! },
      data: { action: "DEFER_OPENING", year: now.year, quarter: now.quarter },
    });
    const command = async (endpoint: string, data: Record<string, unknown>) => {
      const response = await page.request.post(endpoint, {
        headers: { origin: baseURL! },
        data: { ...data, operationKey: randomUUID() },
      });
      const body = await response.json();
      expect(response.ok(), JSON.stringify(body)).toBe(true);
      expect(body.error).toBeNull();
      return body;
    };
    const goal = await command("/api/direction/commands", {
      type: "SAVE_GOAL",
      draft: {
        title: "Make consistent room for meaningful creative work",
        description:
          "A small repeatable practice across work, learning and everyday life.",
        startOn: now.toISODate(),
        targetOn: now.plus({ months: 3 }).toISODate(),
        domainIds: [],
        criteria: [],
        criterionMode: "ALL",
      },
    });
    const experiment = await command("/api/direction/commands", {
      type: "SAVE_EXPERIMENT",
      draft: {
        title:
          "Test whether a quieter weekly planning routine leaves enough time for meaningful creative work",
        question:
          "Does an uninterrupted morning make important work easier to finish?",
        approach: "Protect one morning and write down what changes.",
        startOn: now.toISODate(),
        targetOn: now.plus({ months: 1 }).toISODate(),
        stoppingCondition: "After four weeks",
        expectedEvidence: "Notes from each session",
        goalId: goal.id,
        domainIds: [],
        criteria: [
          {
            key: "manual-audit",
            metric: "MANUAL",
            label:
              "The weekly review makes the next meaningful step clear enough to act on",
            target: "",
          },
        ],
        criterionMode: "ALL",
        sourceInteractionIds: [],
      },
    });
    const idea = await command("/api/direction/thinking/commands", {
      type: "SAVE_IDEA",
      draft: {
        title: "A useful guide to starting smaller and finishing well",
        notes: "Keep examples, questions and practical observations together.",
        domainIds: [],
      },
    });
    const decision = await command("/api/direction/thinking/commands", {
      type: "SAVE_DECISION",
      draft: {
        choice: "Keep the next project deliberately focused",
        reason: "Make enough room to finish and understand what worked.",
        decidedOn: now.toISODate(),
        context: "A busy period with several competing interests",
        alternatives: "Start all ideas at once",
        expectedOutcome: "A finished useful piece",
        reconsiderWhen: "After the first release",
        reviewOn: now.plus({ months: 1 }).toISODate(),
        goalId: goal.id,
      },
    });

    const experimentView = await (
      await page.request.get(`/api/direction/experiments/${experiment.id}`)
    ).json();
    const criterionId = experimentView.evaluation.criteria[0].id;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const capture = async (label: string, width: number) => {
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        header: (() => {
          const countdown = document
            .querySelector(".app-header-season-time")!
            .getBoundingClientRect();
          const account = document
            .querySelector(".app-header-account")!
            .getBoundingClientRect();
          const leading = document
            .querySelector(".app-header-leading")!
            .getBoundingClientRect();
          const trailing = document
            .querySelector(".app-header-trailing")!
            .getBoundingClientRect();
          return {
            countdownRight: countdown.right,
            accountLeft: account.left,
            accountWidth: account.width,
            leadingRight: leading.right,
            trailingLeft: trailing.left,
          };
        })(),
        menus: [
          ...document.querySelectorAll(
            '[role="menu"]:not([aria-hidden="true"])',
          ),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            viewport: innerHeight,
          };
        }),
        icons: [...document.querySelectorAll("main svg")]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => ({
            class: el.getAttribute("class"),
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          })),
      }));
      expect(
        geometry.overflow,
        `${label} page overflow at ${width}`,
      ).toBeLessThanOrEqual(1);
      if (width > 720 && width <= 1024)
        expect(geometry.header.countdownRight).toBeLessThanOrEqual(
          geometry.header.accountLeft,
        );
      for (const menu of geometry.menus) {
        expect(menu.top).toBeGreaterThanOrEqual(0);
        expect(menu.bottom).toBeLessThanOrEqual(menu.viewport);
        expect(menu.left).toBeGreaterThanOrEqual(0);
        expect(menu.right).toBeLessThanOrEqual(width);
      }
      diagnostics.push({ label, width, ...geometry });
      await page.screenshot({
        path: info.outputPath(`${label}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    };
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [route, name] of [
        [`/direction/goals/${goal.id}`, "goal"],
        [`/direction/ideas/${idea.id}`, "idea"],
        [`/direction/decisions/${decision.id}`, "decision"],
      ] as const) {
        await page.goto(route);
        const trigger = page.getByRole("button", {
          name:
            name === "goal"
              ? "Manage record"
              : name === "idea"
                ? "Idea actions"
                : "Decision actions",
          exact: true,
        });
        await trigger.click();
        await expect(page.getByRole("menu")).toBeVisible();
        await capture(`${name}-menu`, width);
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
      }
      for (const [route, name] of [
        [`/direction/goals/${goal.id}`, "goal"],
        [`/direction/experiments/${experiment.id}`, "experiment"],
      ] as const) {
        await page.goto(route);
        await page
          .getByRole("button", { name: "Conclude", exact: true })
          .click();
        await page
          .getByRole("combobox", { name: "Conclusion", exact: true })
          .selectOption(name === "goal" ? "PARTIAL" : "INCONCLUSIVE");
        await capture(`${name}-conclusion`, width);
        page.once("dialog", (dialog) => dialog.accept());
        await page
          .locator(".direction-lifecycle-form")
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
      }
      await page.goto(
        `/direction/experiments/${experiment.id}/criteria/${criterionId}`,
      );
      await page.locator(".direction-assessment > summary").click();
      await capture("manual-assessment", width);
      const backIcon = await page
        .locator(".direction-back-link > svg")
        .first()
        .boundingBox();
      expect(backIcon!.width).toBeGreaterThanOrEqual(15);
      await page.locator(".direction-assessment .select-trigger").click();
      await expect(page.getByRole("menuitemradio").first()).toBeVisible();
      await capture("source-types", width);
      await page.keyboard.press("Escape");
      await page.goto(`/direction/experiments/${experiment.id}/edit`);
      const measurements = page
        .locator("summary")
        .filter({ hasText: "Optional measurements" });
      if ((await measurements.locator("..").getAttribute("open")) === null)
        await measurements.click();
      await capture("measurement-editor", width);
    }
    for (const width of [721, 820, 1025]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/direction/goals/${goal.id}`);
      await capture("header-breakpoint", width);
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(
      `/direction/experiments/${experiment.id}/criteria/${criterionId}`,
    );
    await page.locator(".direction-assessment > summary").click();
    await page.locator(".direction-assessment .select-trigger").click();
    await expect(page.getByRole("menuitemradio").first()).toBeVisible();
    const menu = page.getByRole("menu");
    await menu.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished),
      );
    });
    await capture("source-types-landscape", 844);
    await page.keyboard.press("End");
    const lastChoice = page.getByRole("menuitemradio").last();
    await expect(lastChoice).toBeFocused();
    expect(
      await lastChoice.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitemradio").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.locator(".direction-assessment .select-trigger"),
    ).toBeFocused();
    await writeFile(
      info.outputPath("geometry.json"),
      JSON.stringify(diagnostics, null, 2),
    );
  } finally {
    await deleteDisposableBrowserUser(user.id, email);
  }
});
