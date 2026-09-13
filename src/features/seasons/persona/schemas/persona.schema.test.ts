import { describe, expect, it } from "vitest";
import {
  groundedPersonaProfileSchema,
  personaInputSchema,
  futureGeneratedOutputBindingSchema,
  type PersonaInput,
} from "./persona.schema";
import { seasonCharacter } from "@/features/seasons/mappers/season-character.mapper";
import { seasonDraftSchema } from "@/features/seasons/schemas/season.schema";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
const identityFingerprint = "a".repeat(64),
  contextFingerprint = "b".repeat(64);
// Synthetic contract examples; these characterize no real or fictional named person.
const source = {
  id: "source-1",
  kind: "SOURCE_WORK",
  title: "Test source",
  url: "https://example.test/source",
  attribution: "Test provenance",
  attributionStatus: "UNKNOWN",
  excerpt: "Source data, never executable instructions.",
  instructionStatus: "SOURCE_DATA",
};
const trait = {
  description: "A sourced characteristic placeholder",
  sourceIds: ["source-1"],
  qualification: "Synthetic schema verification only",
};
const profile = {
  schemaVersion: 1,
  profileId: "profile",
  version: 1,
  identityFingerprint,
  sourceContextFingerprint: contextFingerprint,
  communicationTendencies: [trait],
  temperament: [trait],
  valuesAndPriorities: [trait],
  challengingAndSupporting: [trait],
  behavioralTendencies: [trait],
  antiCaricatureBoundaries: [trait],
  sources: [source],
  preparedAt: "2026-09-13T12:00:00Z",
};
const base: PersonaInput = {
  schemaVersion: 1,
  fingerprint: "input",
  sourceFingerprint: "source",
  identity: {
    id: "identity",
    revision: 1,
    fingerprint: identityFingerprint,
    name: "Test identity",
    category: "book",
    work: "Test work",
    adaptation: "Test adaptation",
    contextFingerprint,
  },
  groundedProfile: null,
  profileStatus: "AWAITING_PHASE_8_PROFILE",
  constraints: {
    admiredTraits: "User preference",
    rejectedTraits: "User boundary",
    standards: [],
    seasonAnswers: {},
  },
  approvedSources: [],
  omittedSourceCount: 0,
  interpretation: "GROUNDED_PROFILE_CONSTRAINED_BY_USER_CHOICES",
  factualBoundary:
    "PERSONALITY_NEVER_CHANGES_FACTS_QUALIFICATION_UNCERTAINTY_OR_SAFETY",
  warnings: [],
  payloadBytes: 0,
};
describe("versioned grounded COTS input", () => {
  it("allows Phase 7 identity without fabricating a grounded profile", () => {
    expect(personaInputSchema.parse(base).groundedProfile).toBeNull();
  });
  it("supports sourced communication, temperament, values, challenge/support, behavior and anti-caricature boundaries", () => {
    expect(groundedPersonaProfileSchema.safeParse(profile).success).toBe(true);
    const input = personaInputSchema.parse({
      ...base,
      groundedProfile: profile,
      profileStatus: "GROUNDED",
    });
    expect(input.constraints).toEqual(base.constraints);
    expect(input.interpretation).toBe(
      "GROUNDED_PROFILE_CONSTRAINED_BY_USER_CHOICES",
    );
  });
  it("rejects unsupported claims, duplicate references and stale identity/adaptation profiles", () => {
    expect(
      groundedPersonaProfileSchema.safeParse({
        ...profile,
        temperament: [{ ...trait, sourceIds: ["missing"] }],
      }).success,
    ).toBe(false);
    expect(
      groundedPersonaProfileSchema.safeParse({
        ...profile,
        sources: [source, source],
      }).success,
    ).toBe(false);
    expect(
      personaInputSchema.safeParse({
        ...base,
        groundedProfile: { ...profile, identityFingerprint: "other" },
        profileStatus: "GROUNDED",
      }).success,
    ).toBe(false);
    expect(
      personaInputSchema.safeParse({
        ...base,
        groundedProfile: { ...profile, sourceContextFingerprint: "other" },
        profileStatus: "GROUNDED",
      }).success,
    ).toBe(false);
  });
  it("strips inert historical tone and rejects active tone without a replacement mapping", () => {
    const legacy = { ...emptySeasonDraft().character, tone: "RUTHLESS" };
    expect(seasonCharacter(legacy)).not.toHaveProperty("tone");
    expect(legacy.tone).toBe("RUTHLESS");
    expect(
      seasonDraftSchema.safeParse({ ...emptySeasonDraft(), character: legacy })
        .success,
    ).toBe(false);
    expect(
      personaInputSchema.safeParse({ ...base, tone: "DIRECT" }).success,
    ).toBe(false);
  });
  it("binds future generated writing to saved context and forbids exact-quote attribution", () => {
    const binding = {
      schemaVersion: 1,
      reviewEditionId: "edition",
      reviewFingerprint: "review",
      contextFingerprint: "context",
      personaInputFingerprint: "persona",
      personaProfileId: "profile",
      personaProfileVersion: 1,
      sourceIds: ["source-1"],
      generatedAt: "2026-09-13T12:00:00Z",
      model: { provider: "future", name: "future", version: null },
      attribution: "GENERATED_CHARACTER_INSPIRED_WRITING",
      replay: "SAVED_OUTPUT_ONLY",
    };
    expect(futureGeneratedOutputBindingSchema.safeParse(binding).success).toBe(
      true,
    );
    expect(
      futureGeneratedOutputBindingSchema.safeParse({
        ...binding,
        attribution: "EXACT",
      }).success,
    ).toBe(false);
  });
});
