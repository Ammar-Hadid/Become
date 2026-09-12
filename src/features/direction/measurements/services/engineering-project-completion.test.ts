import { describe, expect, it, vi } from "vitest";
import type { EngineeringProject } from "@/generated/prisma/client";
import type { CriterionDraft } from "@/features/direction/types/direction.types";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { validateCriterion } from "@/features/direction/services/criterion.service";
import {
  evaluateCriterion,
  evaluateDirection,
} from "./criterion-evaluation.service";

vi.mock("@/lib/db/adapters/prisma.adapter", () => ({ prisma: {} }));

const criterion: CriterionDraft = {
  key: "completion",
  metric: "ENGINEERING_PROJECT_COMPLETED",
  label: "Finish the project",
  target: "",
  projectId: "selected-project",
};
const horizon = { startOn: "2026-07-01", targetOn: "2026-09-30" };
const at = new Date("2026-09-01T12:00:00Z");
type ProjectState = Pick<
  EngineeringProject,
  "id" | "name" | "status" | "completedOn"
>;
function fixture(
  status: ProjectState["status"] = "ACTIVE",
  completedOn: Date | null = null,
) {
  const project: ProjectState = {
    id: "selected-project",
    name: "Project",
    status,
    completedOn,
  };
  const findFirst = vi.fn(
    async ({ where }: { where: { id: string; userId: string } }) =>
      where.id === project.id && where.userId === "owner" ? project : null,
  );
  const tx = { engineeringProject: { findFirst } } as unknown as DirectionTx;
  return { tx, project, findFirst };
}

describe("Engineering project completion evidence", () => {
  it.each(["PLANNED", "ACTIVE", "PAUSED", "COMPLETED"] as const)(
    "reads %s from the selected owned project even without output or session data",
    async (status) => {
      const { tx } = fixture(
        status,
        status === "COMPLETED" ? new Date("2026-08-01") : null,
      );
      const result = await evaluateCriterion(
        tx,
        "owner",
        criterion,
        horizon,
        at,
      );
      expect(result.reached).toBe(status === "COMPLETED");
      expect(result.value).toBe(status);
      expect(result.target).toBe("COMPLETED");
      expect(result.availability).toBe("AVAILABLE");
      expect(result.sourceCount).toBe(1);
      expect(result.sources[0]).toMatchObject({
        id: "selected-project",
        href: "/engineering/projects/selected-project",
        state: status === "COMPLETED" ? "QUALIFYING" : "EXCLUDED",
      });
    },
  );

  it("requires one existing owned project in validation and evaluation", async () => {
    const { tx } = fixture("COMPLETED");
    await expect(
      validateCriterion(tx, "owner", criterion),
    ).resolves.toMatchObject(criterion);
    for (const [userId, projectId] of [
      ["owner", undefined],
      ["owner", "missing-project"],
      ["another-user", "selected-project"],
    ]) {
      const draft = { ...criterion, projectId };
      await expect(validateCriterion(tx, userId!, draft)).rejects.toMatchObject(
        { field: "criteria.completion.projectId" },
      );
      await expect(
        evaluateCriterion(tx, userId!, draft, horizon, at),
      ).rejects.toMatchObject({ field: "criteria.completion.projectId" });
    }
  });

  it.each([
    { target: "1" },
    { startOn: "2026-08-01" },
    { endOn: "2026-08-31" },
    { currency: "EUR" },
    { evidenceType: "FEATURE_COMPLETED" },
    { domainId: "engineering" },
    { selectedOutreachOnly: true },
  ])(
    "rejects configuration that would imply a different measurement: %o",
    async (patch) => {
      const { tx } = fixture();
      await expect(
        validateCriterion(tx, "owner", { ...criterion, ...patch }),
      ).rejects.toThrow();
    },
  );

  it("evaluates current state independently of completion dates and goal horizons", async () => {
    const { tx } = fixture("COMPLETED", new Date("2025-01-01"));
    for (const lifetime of [
      { startOn: "2027-01-01" },
      { startOn: "2025-06-01", targetOn: "2025-09-30" },
    ]) {
      const result = await evaluateCriterion(
        tx,
        "owner",
        criterion,
        lifetime,
        at,
      );
      expect(result.reached).toBe(true);
      expect(result.availability).toBe("AVAILABLE");
      expect(result.qualification).toContain("Current Engineering status");
    }
  });

  it("fingerprints status and source corrections, with stable pagination", async () => {
    const { tx, project } = fixture("COMPLETED", new Date("2026-08-01"));
    const before = await evaluateCriterion(tx, "owner", criterion, horizon, at);
    const page = await evaluateCriterion(
      tx,
      "owner",
      criterion,
      horizon,
      at,
      undefined,
      25,
    );
    expect(page.sources).toEqual([]);
    expect(page.sourceCount).toBe(1);
    expect(page.nextCursor).toBeNull();
    expect(page.fingerprint).toBe(before.fingerprint);
    project.completedOn = new Date("2026-08-02");
    const corrected = await evaluateCriterion(
      tx,
      "owner",
      criterion,
      horizon,
      at,
    );
    expect(corrected.reached).toBe(true);
    expect(corrected.fingerprint).not.toBe(before.fingerprint);
    project.status = "ACTIVE";
    project.completedOn = null;
    const reopened = await evaluateCriterion(
      tx,
      "owner",
      criterion,
      horizon,
      at,
    );
    expect(reopened.reached).toBe(false);
    expect(reopened.fingerprint).not.toBe(corrected.fingerprint);
  });

  it("participates in the existing ALL/ANY combination rules", async () => {
    const { tx } = fixture("COMPLETED");
    const criteria: CriterionDraft[] = [
      criterion,
      { key: "judgment", metric: "MANUAL", label: "Quality", target: "" },
    ];
    expect(
      (await evaluateDirection(tx, "owner", criteria, horizon, "ALL", at))
        .criteriaMet,
    ).toBeNull();
    expect(
      (await evaluateDirection(tx, "owner", criteria, horizon, "ANY", at))
        .criteriaMet,
    ).toBe(true);
  });
});
