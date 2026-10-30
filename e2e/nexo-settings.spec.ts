import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import { nexoSettingsSchema } from "../src/features/nexo/schemas/nexo-settings.schema";

test("Google character profile with 8192 tokens and task routes survives repeated saves and refresh", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `nexo-settings-${randomUUID()}@example.test`;
  await page.getByTestId("name-input").fill("Disposable Nexo settings QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-nexo-settings-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await page.goto("/settings/nexo");
  await expect(
    page
      .locator(".nexo-route-task")
      .filter({ hasText: "Character identification" }),
  ).toHaveCount(0);
  async function selectTask(task: string) {
    const mobilePicker = page.getByRole("combobox", {
      name: "Choose a task",
      exact: true,
    });
    if (await mobilePicker.isVisible()) {
      const value = await mobilePicker
        .getByRole("option", { name: new RegExp(`^${task} —`) })
        .getAttribute("value");
      expect(value).toBeTruthy();
      await mobilePicker.selectOption(value!);
    } else {
      await page.locator(".nexo-route-task").filter({ hasText: task }).click();
    }
  }
  await page.getByRole("button", { name: "Add first profile" }).click();
  await page.getByRole("button", { name: "Provider", exact: true }).click();
  await page
    .getByRole("menuitemradio", { name: "Google Gemini", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Profile name", exact: true })
    .fill("Character AI");
  await page
    .getByRole("textbox", { name: "Model ID", exact: false })
    .fill("gemini-3.8-flash");
  await page.getByText("Advanced model controls", { exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Maximum output tokens", exact: true })
    .fill("8192");
  await page.getByText("Advanced model controls", { exact: true }).click();
  // Collapsed controls still participate in browser form validity.
  await page
    .getByRole("button", { name: "Save Nexo settings", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.nexoSettings.findUnique({ where: { userId: user.id } }))
          ?.version,
    )
    .toBe(1);
  await page.reload();
  await expect(page.locator(".nexo-profile-identity")).toContainText(
    "Character AI",
  );
  const saved = await prisma.nexoSettings.findUniqueOrThrow({
    where: { userId: user.id },
  });
  expect(saved.config).toMatchObject({
    profiles: [
      { provider: "google", model: "gemini-3.8-flash", maxOutputTokens: 8192 },
    ],
  });
  const profileId = (saved.config as { profiles: { id: string }[] }).profiles[0]
    .id;
  // A retired assignment in saved settings must not prevent loading or saving.
  await prisma.nexoSettings.update({
    where: { userId: user.id },
    data: {
      config: {
        ...nexoSettingsSchema.parse(saved.config),
        assignments: [{ taskId: "cots.identity-resolution", profileId }],
      },
    },
  });
  await page.reload();
  await expect(
    page
      .locator(".nexo-route-task")
      .filter({ hasText: "Character identification" }),
  ).toHaveCount(0);
  for (const task of [
    "Character research",
    "Season assembly",
    "Character profile",
    "Character visual intent",
  ]) {
    await selectTask(task);
    await page
      .getByRole("combobox", { name: /^Model profile/ })
      .selectOption(profileId);
  }
  await expect(page.locator(".nexo-route-path")).toContainText("Google Gemini");
  await page
    .getByRole("button", { name: "Save Nexo settings", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.nexoSettings.findUnique({ where: { userId: user.id } }))
          ?.version,
    )
    .toBe(2);
  await page.reload();
  for (const task of [
    "Character research",
    "Season assembly",
    "Character profile",
    "Character visual intent",
  ]) {
    const route = page.locator(".nexo-route-task").filter({ hasText: task });
    await expect(route).toContainText("Character AI");
    await selectTask(task);
    await expect(
      page.getByRole("combobox", { name: /^Model profile/ }),
    ).toHaveValue(profileId);
  }
  await page.getByRole("spinbutton", { name: /^Daily limit/ }).fill("21");
  await page
    .getByRole("button", { name: "Save Nexo settings", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.nexoSettings.findUnique({ where: { userId: user.id } }))
          ?.version,
    )
    .toBe(3);
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: /^Daily limit/ }),
  ).toHaveValue("21");
  const final = await prisma.nexoSettings.findUniqueOrThrow({
    where: { userId: user.id },
  });
  expect(final.config).toMatchObject({
    assignments: expect.arrayContaining([
      { taskId: "cots.character-research", profileId },
      { taskId: "cots.season-assembly", profileId },
      { taskId: "cots.character-profile", profileId },
      { taskId: "cots.visual-intent", profileId },
    ]),
  });
  expect(nexoSettingsSchema.parse(final.config).assignments).toHaveLength(4);
  expect(JSON.stringify(final.config)).not.toContain(
    "cots.identity-resolution",
  );
});
