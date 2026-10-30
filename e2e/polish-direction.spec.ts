import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { DateTime } from "luxon";
import { test, expect } from "./utils/browser-test.util";
import { deleteDisposableBrowserUser } from "./utils/disposable-user.util";

// A disposable account lets long labels and populated details expose layout defects.
test("Direction controls keep readable text, trailing icons and usable spacing", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(240_000);
  const email = `polish-direction-${randomUUID()}@example.test`;
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: { name: "Detail audit", email, password: `Audit!${randomUUID()}` },
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
        title: "Test a quieter start to the working week",
        question:
          "Does an uninterrupted morning make important work easier to finish?",
        approach: "Protect one morning and write down what changes.",
        startOn: now.toISODate(),
        targetOn: now.plus({ months: 1 }).toISODate(),
        stoppingCondition: "After four weeks",
        expectedEvidence: "Notes from each session",
        goalId: goal.id,
        domainIds: [],
        criteria: [],
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
    const routes = [
      "/direction",
      "/direction/goals",
      `/direction/goals/${goal.id}`,
      `/direction/goals/${goal.id}/edit`,
      "/direction/experiments",
      `/direction/experiments/${experiment.id}`,
      `/direction/experiments/${experiment.id}/edit`,
      "/direction/ideas",
      `/direction/ideas/${idea.id}`,
      "/direction/decisions",
      `/direction/decisions/${decision.id}`,
      "/direction/decisions/new",
      "/direction/seasons",
    ];
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator("main h1")).toBeVisible();
        const details = await page.evaluate(() => {
          const visible = (el: Element) =>
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0;
          const arrows = [
            ...document.querySelectorAll(
              "main button, main a, main summary, main .become-native-select",
            ),
          ]
            .filter(visible)
            .flatMap((control) => {
              const svg = control.querySelector(
                'svg[class*="chevron"], svg[class*="arrow-right"], svg[class*="arrow-up-right"]',
              );
              if (!svg || !visible(svg)) return [];
              const rect = control.getBoundingClientRect(),
                icon = svg.getBoundingClientRect(),
                style = getComputedStyle(control);
              const select = control.querySelector("select");
              return [
                {
                  label: control.textContent?.trim().slice(0, 95),
                  tag: control.tagName,
                  class: control.className,
                  display: style.display,
                  direction: style.flexDirection,
                  control: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  },
                  icon: {
                    x: icon.x,
                    y: icon.y,
                    width: icon.width,
                    height: icon.height,
                  },
                  select: select
                    ? {
                        border: getComputedStyle(select).borderWidth,
                        height: select.getBoundingClientRect().height,
                      }
                    : null,
                },
              ];
            });
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            arrows,
          };
        });
        diagnostics.push({ width, route, ...details });
        expect(details.overflow, `${route} at ${width}`).toBeLessThanOrEqual(1);
        for (const arrow of details.arrows) {
          if (arrow.select) {
            expect(
              arrow.select.height,
              `${route}: select inside its frame`,
            ).toBeLessThanOrEqual(arrow.control.height + 1);
            expect(
              Math.abs(
                arrow.icon.y +
                  arrow.icon.height / 2 -
                  arrow.control.y -
                  arrow.control.height / 2,
              ),
              `${route}: centered chevron`,
            ).toBeLessThanOrEqual(2);
          }
        }
        await page.screenshot({
          path: info.outputPath(`${width}-${route.replaceAll("/", "-")}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [route, labels] of [
        [
          `/direction/ideas/${idea.id}`,
          [
            "Edit idea",
            "Create content",
            "Set a goal",
            "Run an experiment",
            "Link existing",
          ],
        ],
        [
          `/direction/decisions/${decision.id}`,
          ["Edit decision", "Record follow-up", "Add reflection"],
        ],
      ] as const) {
        await page.goto(route);
        for (const label of labels) {
          const trigger = page
            .getByRole("button", { name: label, exact: true })
            .and(page.locator('button[type="button"]'));
          await expect(trigger).toBeVisible();
          const inline = await trigger.evaluate((el) => {
            const icon = el.querySelector("svg")!.getBoundingClientRect();
            const box = el.getBoundingClientRect();
            return {
              display: getComputedStyle(el).display,
              center: Math.abs(
                icon.y + icon.height / 2 - box.y - box.height / 2,
              ),
            };
          });
          expect(["flex", "inline-flex"]).toContain(inline.display);
          expect(inline.center).toBeLessThanOrEqual(2);
          await trigger.click();
          const dialog = page.locator("dialog[open]");
          await expect(dialog).toBeVisible();
          const overflow = await dialog.evaluate(
            (el) => el.scrollWidth - el.clientWidth,
          );
          expect(overflow, `${label} dialog at ${width}`).toBeLessThanOrEqual(
            1,
          );
          await page.screenshot({
            path: info.outputPath(`${width}-${label.replaceAll(" ", "-")}.png`),
            fullPage: true,
            animations: "disabled",
          });
          await page.keyboard.press("Escape");
          await expect(page.locator("dialog[open]")).toHaveCount(0);
          await expect(trigger).toBeFocused();
        }
      }
    }
    await writeFile(
      info.outputPath("geometry.json"),
      JSON.stringify(diagnostics, null, 2),
    );
  } finally {
    await deleteDisposableBrowserUser(user.id, email);
  }
});
