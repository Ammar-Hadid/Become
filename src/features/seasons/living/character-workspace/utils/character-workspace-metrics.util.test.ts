import { describe, expect, it } from "vitest";
import { characterWorkspaceMetrics } from "./character-workspace-metrics.util";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

const profile = {
  characterName: "Levi Ackerman",
  sourceWork: "Attack on Titan",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    { id: "one", title: "Profile", notes: "Official profile" },
    { id: "two", title: "Synopsis", notes: "" },
  ],
  speechPatterns: [{ description: "Direct", sourceIds: ["one"] }],
  signaturePhrases: [],
  canonReferences: [{ description: "Erwin", sourceIds: ["missing"] }],
  responseToSuccess: "Quiet approval",
  responseToSetback: "Names the gap",
  responseToRecovery: "Notes recovery",
  visualDirection: "Reserved",
  visualBoundaries: "Recognizable",
} satisfies LivingCharacterProfile;

describe("characterWorkspaceMetrics", () => {
  it("labels field and citation coverage without claiming canon accuracy", () => {
    expect(characterWorkspaceMetrics(profile)).toMatchObject({
      sourceCompleteness: 50,
      detailCount: 2,
      linkedDetails: 1,
      citationCoverage: 50,
    });
  });
});
