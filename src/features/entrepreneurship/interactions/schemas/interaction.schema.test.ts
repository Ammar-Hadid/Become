import { describe, expect, it } from "vitest";
import {
  interactionSchema,
  daySchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
describe("interaction capture validation", () => {
  it("allows the minimum event without forcing evidence or follow-up", () => {
    const value = interactionSchema.parse({
      kind: "CONVERSATION",
      occurredAt: "2026-09-01",
      summary: "Discussed operations.",
    });
    expect(value.observations).toEqual([]);
    expect(value.followUp).toBeUndefined();
  });
  it("rejects a hypothesis masquerading as an observation kind", () => {
    expect(
      interactionSchema.safeParse({
        kind: "CONVERSATION",
        occurredAt: "2026-09-01",
        summary: "Call",
        observations: [
          {
            kind: "HYPOTHESIS",
            statement: "Maybe",
            sourceDescription: "Guess",
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("uses Amsterdam calendar days across DST", () => {
    expect(daySchema.parse("2026-03-29").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(daySchema.parse("2026-03-30").toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
    expect(daySchema.safeParse("2026-02-30").success).toBe(false);
  });
});
