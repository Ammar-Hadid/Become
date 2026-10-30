import { describe, expect, it } from "vitest";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";
import { characterResponseReadiness } from "./character-response-readiness.util";

const profile = {
  characterName: "Levi Ackerman",
  sourceWork: "Attack on Titan",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    {
      id: "one",
      title: "Profile",
      notes:
        "His official profile establishes his role and restrained demeanor.",
    },
    {
      id: "two",
      title: "Episode",
      notes: "An episode shows a difficult decision under pressure.",
    },
  ],
  speechPatterns: [
    {
      description: "He speaks in short precise statements without flattery.",
      sourceIds: ["one"],
    },
    {
      description: "He weighs uncertainty before giving a direct instruction.",
      sourceIds: ["two"],
    },
  ],
  signaturePhrases: [],
  canonReferences: [],
  responseToSuccess: "He acknowledges concrete progress with quiet approval.",
  responseToSetback: "He names the measurable gap without insult.",
  responseToRecovery: "He recognizes the first credible step forward.",
  visualDirection:
    "Short black undercut, cool grey eyes, compact build and green Survey Corps cloak.",
  visualBoundaries: "Keep the same face, costume and restrained expression.",
} satisfies LivingCharacterProfile;

describe("characterResponseReadiness", () => {
  it("allows a response once the draft has sourced voice and reactions", () => {
    expect(characterResponseReadiness(profile)).toEqual({
      ready: true,
      missing: [],
    });
  });

  it("blocks a superficially filled draft whose second speech pattern has no described source", () => {
    expect(
      characterResponseReadiness({
        ...profile,
        sources: [profile.sources[0], { ...profile.sources[1], notes: "" }],
      }),
    ).toMatchObject({ ready: false });
  });

  it("waits for specific visual and behavioral direction before a combined portrait and response test", () => {
    const result = characterResponseReadiness({
      ...profile,
      visualDirection: "cool",
      responseToSetback: "badass",
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain(
      "a visual identity with recognizable features",
    );
    expect(result.missing).toContain(
      "specific reactions to success, setbacks, and recovery",
    );
  });
});
