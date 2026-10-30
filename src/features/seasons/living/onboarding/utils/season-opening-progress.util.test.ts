import { describe, expect, it } from "vitest";
import { resolveOpeningProgress } from "./season-opening-progress.util";

describe("opening progress presentation", () => {
  it.each(["ENTRY", "WORLD", "ASSEMBLING", "NEEDS_INPUT", "SUMMARY"] as const)(
    "keeps %s in Character until actual summary approval",
    (stage) => {
      const result = resolveOpeningProgress(stage);
      expect(result.phases.map((phase) => phase.state)).toEqual([
        "current",
        "upcoming",
        "upcoming",
      ]);
    },
  );
  it("keeps assembly, clarification and corrections within the third step", () => {
    for (const stage of ["ASSEMBLING", "NEEDS_INPUT", "SUMMARY"] as const) {
      expect(resolveOpeningProgress(stage).preparationIndex).toBe(2);
      expect(
        resolveOpeningProgress(stage).preparation.map((item) => item.state),
      ).toEqual(["complete", "complete", "current"]);
    }
  });
  it.each([
    "BANNER_PREPARATION",
    "PORTRAIT_PREPARATION",
    "SCENE_METHOD",
    "SCENE_PREPARATION",
    "GENERATING_BANNER",
    "BANNER",
    "GENERATING_PORTRAIT",
    "PORTRAIT",
    "GENERATING_SCENES",
    "SCENES",
  ] as const)(
    "does not imply activation while %s remains unreviewed",
    (stage) => {
      const result = resolveOpeningProgress(stage);
      expect(result.preparationIndex).toBeNull();
      expect(result.phases.map((phase) => phase.state)).toEqual([
        "complete",
        "current",
        "upcoming",
      ]);
    },
  );
  it("only completes activation when the actual state is ACTIVE", () => {
    expect(
      resolveOpeningProgress("READY").phases.map((phase) => phase.state),
    ).toEqual(["complete", "complete", "current"]);
    expect(
      resolveOpeningProgress("ACTIVE").phases.every(
        (phase) => phase.state === "complete",
      ),
    ).toBe(true);
  });
});
