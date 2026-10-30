import { randomUUID } from "node:crypto";
import { expect, test } from "./utils/browser-test.util";
import { deferAutomaticSeasonOpening } from "./utils/season-arrival.util";

test("a Goal reads completion from its selected Engineering project", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByTestId("name-input").fill("Project completion QA");
  await page
    .getByTestId("email-input")
    .fill(`project-goal-${randomUUID()}@example.com`);
  await page
    .getByTestId("password-input")
    .fill("become-disposable-project-password");
  await page.getByTestId("auth-submit").click();
  await deferAutomaticSeasonOpening(page);

  const projectName = "Selected Engineering project";
  await page.goto("/engineering/projects/new");
  await page.getByTestId("engineering-project-name").fill(projectName);
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(/\/engineering\/projects\/(?!new$)[^/]+$/);
  const projectPath = new URL(page.url()).pathname;

  await page.goto("/direction/goals/new");
  await page
    .getByRole("textbox", { name: "Goal", exact: true })
    .fill("Complete the selected project");
  await page.getByRole("button", { name: "Add evidence definition" }).click();
  await page
    .getByRole("combobox", { name: "Evidence type" })
    .selectOption({ label: "Engineering project completed" });
  await expect(
    page.getByRole("textbox", { name: "Target project status", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/Evidence starts|Evidence ends/)).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /Output kind/ })).toHaveCount(
    0,
  );
  const projectPicker = page.getByRole("combobox", {
    name: "Engineering project",
  });
  await projectPicker.fill(projectName);
  await page.getByRole("option", { name: projectName, exact: true }).click();
  await page.getByRole("button", { name: "Preview current evidence" }).click();
  await expect(
    page.getByRole("region", {
      name: "Evidence preview for Engineering project completed",
    }),
  ).toContainText("Active / Completed");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page).toHaveURL(/\/direction\/goals\/(?!new$)[^/]+$/);
  const goalPath = new URL(page.url()).pathname;
  const goalId = goalPath.split("/").at(-1)!;
  const active = await (
    await page.request.get(`/api/direction/goals/${goalId}`)
  ).json();
  expect(active.evaluation.criteriaMet).toBe(false);
  expect(active.criteria[0]).toMatchObject({
    metric: "ENGINEERING_PROJECT_COMPLETED",
    projectId: projectPath.split("/").at(-1),
    target: "",
  });

  await page.getByRole("link", { name: "Edit goal" }).click();
  await expect(
    page.getByRole("combobox", { name: "Evidence type" }),
  ).toHaveValue("ENGINEERING_PROJECT_COMPLETED");
  await expect(
    page.getByRole("combobox", { name: "Engineering project" }),
  ).toHaveValue(projectName);

  await page.goto(`${projectPath}/edit`);
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("COMPLETED");
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(projectPath);
  await page.goto(goalPath);
  const completed = await (
    await page.request.get(`/api/direction/goals/${goalId}`)
  ).json();
  expect(completed.evaluation.criteriaMet).toBe(true);
  expect(completed.status).toBe("ACTIVE");
  const reading = page.getByRole("region", {
    name: "Evidence preview for Engineering project completed",
  });
  await expect(reading).toContainText("Completed / Completed");
  await reading.getByText("Inspect 1 source record", { exact: true }).click();
  await expect(
    reading.getByRole("link", { name: new RegExp(projectName) }),
  ).toHaveAttribute("href", projectPath);

  await page.goto(`${projectPath}/edit`);
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("ACTIVE");
  await page.getByTestId("save-engineering-project").click();
  await expect(page).toHaveURL(projectPath);
  await page.goto(goalPath);
  await expect(
    page.getByRole("region", {
      name: "Evidence preview for Engineering project completed",
    }),
  ).toContainText("Active / Completed");
});
