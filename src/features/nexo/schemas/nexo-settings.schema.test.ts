import { describe, expect, it } from "vitest";
import {
  ACTIVE_NEXO_TASKS,
  NEXO_TASKS,
} from "../constants/nexo-task.constants";
import {
  EMPTY_NEXO_SETTINGS,
  nexoProfileSchema,
  nexoSettingsSchema,
} from "./nexo-settings.schema";

describe("retired character identification assignment", () => {
  const profile = nexoProfileSchema.parse({
    id: "existing-model",
    name: "Existing model",
    provider: "google",
    model: "test-model",
    reasoning: "medium",
    verbosity: "medium",
    maxOutputTokens: 8192,
    timeoutSeconds: 180,
  });
  const config = {
    ...EMPTY_NEXO_SETTINGS,
    profiles: [profile],
    assignments: [
      { taskId: "cots.identity-resolution", profileId: profile.id },
      { taskId: "cots.character-research", profileId: profile.id },
      { taskId: "cots.season-assembly", profileId: profile.id },
    ],
  };

  it("loads legacy settings without the retired route and preserves the rest", () => {
    const parsed = nexoSettingsSchema.parse(config);
    expect(parsed).toEqual({
      ...config,
      assignments: config.assignments.slice(1),
    });
    expect(nexoSettingsSchema.parse(parsed)).toEqual(parsed);
    expect(NEXO_TASKS).not.toContain("cots.identity-resolution");
    expect(ACTIVE_NEXO_TASKS.map((task) => task.id)).not.toContain(
      "cots.identity-resolution",
    );
  });

  it("still rejects unknown tasks and missing profiles", () => {
    expect(
      nexoSettingsSchema.safeParse({
        ...config,
        assignments: [{ taskId: "unknown.task", profileId: profile.id }],
      }).success,
    ).toBe(false);
    expect(
      nexoSettingsSchema.safeParse({
        ...config,
        assignments: [
          { taskId: "cots.character-research", profileId: "missing" },
        ],
      }).success,
    ).toBe(false);
  });
});
