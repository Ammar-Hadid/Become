import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("server-only", () => ({}));
vi.mock("@/features/nexo/services/nexo-runtime.service", () => ({
  executeAiTask: vi.fn(),
}));
import { executeAiTask } from "@/features/nexo/services/nexo-runtime.service";
import { livingCharacterProfileSchema } from "../schemas/living-season.schema";
import {
  researchOnboardingCharacter,
  assembleOnboardingDraft,
} from "./onboarding-research.service";

const identity = {
  displayName: "Fixture",
  sourceWork: "Work",
  adaptation: "TV anime",
};
const source = {
  id: "source",
  title: "Official adaptation",
  url: "https://example.test/official",
  notes:
    "A detailed source describing voice, appearance and recognizable behavior.",
};
const coverage = {
  scope: "Complete original story with labeled adaptation differences",
  endpoint: "The documented final chapter",
  adaptationNotes:
    "Later original-source events are not claimed to have been animated.",
  early: {
    description: "Early evidence of motives and personality.",
    sourceIds: ["source"],
  },
  middle: {
    description: "Middle turning points alter relationships.",
    sourceIds: ["source"],
  },
  late: {
    description: "The final resolution changes their outlook.",
    sourceIds: ["source"],
  },
  gaps: [] as string[],
};
const base = {
  userId: "owner",
  runId: "run",
  revision: 1,
  identity,
  setting: "A walled city; research the entire original story.",
  visualDirection:
    "Freedom through sustained effort; use one anime appearance.",
  correction: "",
};
describe("onboarding evidence and structured wire contract", () => {
  it("allows a complete personality arc without expanding the short speech-detail limit", () => {
    const detail = {
      description:
        "A complete sentence about their changing beliefs and relationships. "
          .repeat(20)
          .trim(),
      sourceIds: ["source"],
    };
    expect(
      livingCharacterProfileSchema.shape.personality.safeParse(detail).success,
    ).toBe(true);
    expect(
      livingCharacterProfileSchema.shape.speechPatterns.element.safeParse(
        detail,
      ).success,
    ).toBe(false);
    expect(
      livingCharacterProfileSchema.shape.personality.safeParse({
        ...detail,
        description: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
  it.each([
    [
      "https://example.test/Bystander_(Episode)",
      "https://example.test/Bystander_%28Episode%29",
      true,
    ],
    [
      "https://example.test/Bystander_(Episode)",
      "https://example.test/Bystander_%28Chapter%29",
      false,
    ],
    ["https://example.test/a/b", "https://example.test/a%2Fb", false],
    [
      "https://example.test/story?episode=2",
      "https://example.test/story?episode=1",
      false,
    ],
  ])(
    "compares retrieved URL identity safely: %s",
    async (claimed, retrieved, accepted) => {
      vi.mocked(executeAiTask).mockResolvedValue({
        status: "READY",
        output: {
          coverage,
          sources: [{ ...source, url: claimed }],
          question: null,
        },
        usage: { sources: [{ url: retrieved }] },
      } as never);
      if (accepted)
        await expect(researchOnboardingCharacter(base)).resolves.toMatchObject({
          sources: [{ ...source, url: claimed }],
        });
      else
        await expect(researchOnboardingCharacter(base)).rejects.toThrow(
          /did not retrieve/,
        );
    },
  );
  it("rejects a source the research tool never retrieved", async () => {
    vi.mocked(executeAiTask).mockResolvedValue({
      status: "READY",
      output: { coverage, sources: [source], question: null },
      usage: { sources: [] },
    } as never);
    await expect(researchOnboardingCharacter(base)).rejects.toThrow(
      /did not retrieve/,
    );
    vi.mocked(executeAiTask).mockResolvedValue({
      status: "READY",
      output: { coverage, sources: [source], question: null },
      usage: { sources: [{ url: source.url }] },
    } as never);
    expect((await researchOnboardingCharacter(base)).sources).toEqual([source]);
    const request = vi.mocked(executeAiTask).mock.calls.at(-1)![0];
    expect(request.promptVersion).toBe("season-character-research-v4");
    expect(request.instructions).toContain("full narrative arc");
    expect(request.instructions).toContain("must not write a Season summary");
    expect(request.instructions).toContain(
      "IDs actually present in the sources array",
    );
    expect(request.instructions).toContain("explicit owner cutoff");
    expect(request.input).toMatchObject({
      setting: base.setting,
      visualDirection: base.visualDirection,
    });
  });
  it("turns declared missing ending evidence into an actionable question", async () => {
    vi.mocked(executeAiTask).mockResolvedValue({
      status: "READY",
      output: {
        coverage: {
          ...coverage,
          gaps: ["The ending has not been researched."],
        },
        sources: [source],
        question: null,
      },
      usage: { sources: [{ url: source.url }] },
    } as never);
    const result = await researchOnboardingCharacter(base);
    expect(result.question).toContain("ending has not been researched");
    const calls = vi.mocked(executeAiTask).mock.calls.length;
    expect(
      (
        await assembleOnboardingDraft({
          ...base,
          setting: "Walls",
          visualDirection: "Freedom",
          research: result,
          existingDraft: null,
        })
      ).draft,
    ).toBeNull();
    expect(vi.mocked(executeAiTask).mock.calls.length).toBe(calls);
  });
  it("rejects coverage with missing evidence or duplicate source IDs", async () => {
    for (const output of [
      {
        coverage: {
          ...coverage,
          late: { ...coverage.late, sourceIds: ["invented"] },
        },
        sources: [source],
        question: null,
      },
      {
        coverage: { ...coverage, late: { ...coverage.late, sourceIds: [] } },
        sources: [source],
        question: null,
      },
      { coverage, sources: [source, source], question: null },
    ]) {
      vi.mocked(executeAiTask).mockResolvedValue({
        status: "READY",
        output,
        usage: { sources: [{ url: source.url }] },
      } as never);
      await expect(researchOnboardingCharacter(base)).rejects.toThrow(
        /evidence|unique/,
      );
    }
  });
  it("rejects a production brief that ends mid-word without rejecting complete prose", async () => {
    vi.mocked(executeAiTask).mockResolvedValue({
      status: "READY",
      output: { draft: null, question: "Which evidence?" },
    } as never);
    await assembleOnboardingDraft({
      ...base,
      research: { coverage, sources: [source], question: null },
      existingDraft: null,
    });
    const request = vi.mocked(executeAiTask).mock.calls.at(-1)![0];
    const prose =
      "A complete direction preserving the approved character and world.";
    const draft = {
      profile: {
        characterName: identity.displayName,
        sourceWork: identity.sourceWork,
        adaptation: identity.adaptation,
        outputLanguage: "en",
        coverage,
        sources: [source],
        personality: { description: prose, sourceIds: [source.id] },
        speechPatterns: [{ description: prose, sourceIds: [source.id] }],
        signaturePhrases: [],
        canonReferences: [],
        responseToSuccess: prose,
        responseToSetback: prose,
        responseToRecovery: prose,
        visualDirection: prose,
        visualBoundaries: prose,
      },
      visualIntent: {
        feeling: prose,
        demeanor: prose,
        anchors: prose,
        atmosphere: prose,
        avoid: prose,
        productionBrief: {
          theme: prose,
          visualEra: prose,
          worldRules: prose,
          progression: prose,
          expressionRules: prose,
        },
      },
      summary: `${prose} ${prose}`,
      bannerCopy: {
        quote: "",
        attribution: "",
        quoteSource: "",
        rightLine: "Keep moving.",
      },
    };
    const parsed = request.outputSchema.parse({ draft, question: null });
    expect(() => request.validateOutput(parsed)).not.toThrow();
    const cited = request.outputSchema.parse({
      draft: {
        ...draft,
        visualIntent: {
          ...draft.visualIntent,
          productionBrief: {
            ...draft.visualIntent.productionBrief,
            visualEra: `${prose} [source]`,
            expressionRules: `${prose} [source] [source]`,
          },
        },
      },
      question: null,
    });
    expect(() => request.validateOutput(cited)).not.toThrow();
    const incomplete = request.outputSchema.parse({
      draft: {
        ...draft,
        visualIntent: {
          ...draft.visualIntent,
          productionBrief: {
            ...draft.visualIntent.productionBrief,
            progression: "At the fourth chapter keep a closed, br",
          },
        },
      },
      question: null,
    });
    expect(() => request.validateOutput(incomplete)).toThrow(/mid-sentence/);
  });
  it("builds a strict schema from the refined profile and preserves a missing-evidence question", async () => {
    vi.mocked(executeAiTask).mockResolvedValue({
      status: "READY",
      output: { draft: null, question: "Which source describes their speech?" },
    } as never);
    const result = await assembleOnboardingDraft({
      ...base,
      setting: "Mountain city",
      visualDirection: "Early morning light",
      research: { coverage, sources: [source], question: null },
      existingDraft: null,
    });
    expect(result.draft).toBeNull();
    const request = vi.mocked(executeAiTask).mock.calls.at(-1)![0];
    const schema = z.toJSONSchema(request.outputSchema);
    expect(schema.properties?.draft).toBeDefined();
    expect(JSON.stringify(schema).indexOf('"summary"')).toBeLessThan(
      JSON.stringify(schema).indexOf('"profile"'),
    );
    expect(JSON.stringify(schema)).toContain("productionBrief");
    expect(JSON.stringify(schema)).toContain("coverage");
    const checkStrictObjects = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(checkStrictObjects);
        return;
      }
      const node = value as Record<string, unknown>;
      if (node.type === "object" && node.properties) {
        expect(node.required).toEqual(Object.keys(node.properties));
        expect(node.additionalProperties).toBe(false);
      }
      Object.values(node).forEach(checkStrictObjects);
    };
    checkStrictObjects(schema);
    expect(request.input).not.toHaveProperty("existingDraft");
    expect(request.input).toHaveProperty("paceStates.ON_TRACK");
    expect(request.instructions).toContain(
      "never ahead/steady/behind or A/B/C",
    );
    expect(request.defaultProfile).toBeUndefined();
    expect(request.promptVersion).toBe("season-assembly-v6");
    expect(request.instructions).toContain("Scenery is not a canon cutoff");
    expect(request.instructions).toContain("Do not foreground an early era");
  });
});
