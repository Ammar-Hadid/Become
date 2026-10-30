import { describe, expect, it } from "vitest";
import { IMAGE_TEMPLATE_DEFINITIONS } from "../constants/image-direction.constants";
import {
  assembleImagePromptPackage,
  sceneTemplateKey,
} from "./image-prompt-package.util";
import type { LivingCharacterProfile } from "@/features/seasons/living/schemas/living-season.schema";

const profile: LivingCharacterProfile = {
  characterName: "Test Character",
  sourceWork: "Test Story",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    {
      id: "a",
      title: "Official profile",
      notes:
        "A reviewed description of the character's consistent choices and visual traits.",
    },
  ],
  speechPatterns: [{ description: "Measured speech", sourceIds: ["a"] }],
  signaturePhrases: [],
  canonReferences: [],
  responseToSuccess: "Quietly supportive",
  responseToSetback: "Names the problem",
  responseToRecovery: "Acknowledges the next step",
  visualDirection: "Distinct expressive eyes and a recognizable hairstyle",
  visualBoundaries: "Do not change the costume or expression without reason",
};
const templates = IMAGE_TEMPLATE_DEFINITIONS.map(({ key, text }) => ({
  key,
  version: 1,
  text,
}));
const base = {
  profile,
  setting: "A lived-in city",
  visualBrief: "Detailed natural light",
  identityId: "identity-1",
  profileVersion: 2,
  briefRevision: 3,
  intentVersion: 1,
  references: [],
  templates,
};

describe("one image prompt package", () => {
  it("adapts the same banner recipe to distinct approved character intent", () => {
    const gentle = assembleImagePromptPackage({
      ...base,
      variant: "banner-desktop",
      visualIntent: {
        feeling: "Warm reassurance",
        demeanor: "Open and attentive",
        anchors: "Soft expression and recognizable uniform",
        atmosphere: "Welcoming afternoon",
        avoid: "Combat and intimidation",
      },
    });
    const stern = assembleImagePromptPackage({
      ...base,
      variant: "banner-desktop",
      visualIntent: {
        feeling: "Disciplined resolve",
        demeanor: "Reserved and demanding",
        anchors: "Focused gaze and recognizable uniform",
        atmosphere: "Purposeful quiet",
        avoid: "Cartoonish anger and battle effects",
      },
    });
    expect(gentle.prompt).toContain("Warm reassurance");
    expect(stern.prompt).toContain("Disciplined resolve");
    expect(gentle.prompt).toContain("cinematic lighting");
    expect(stern.prompt).toContain("cinematic lighting");
    expect(gentle.receipt).not.toBe(stern.receipt);
  });

  it("pins the exact template versions, references and text in a stable receipt", () => {
    const input = {
      ...base,
      variant: "portrait" as const,
      visualIntent: {
        feeling: "Warm reassurance",
        demeanor: "Open and attentive",
        anchors: "Recognizable face",
        atmosphere: "Welcoming afternoon",
        avoid: "Battle pose",
      },
      references: [
        {
          kind: "reference-sheet",
          id: "sheet-1",
          storageKey: "private/sheet.webp",
          href: "/api/sheet-1",
        },
      ],
    };
    const first = assembleImagePromptPackage(input);
    expect(assembleImagePromptPackage(input)).toEqual(first);
    expect(first.templateVersions).toEqual([
      { key: "visual-language", version: 1 },
      { key: "portrait", version: 1 },
    ]);
    expect(
      assembleImagePromptPackage({
        ...input,
        templates: templates.map((item) =>
          item.key === "portrait" ? { ...item, version: 2 } : item,
        ),
      }).receipt,
    ).not.toBe(first.receipt);
    expect(
      assembleImagePromptPackage({ ...input, references: [] }).receipt,
    ).not.toBe(first.receipt);
  });

  it("maps all six scene states and formats to explicit templates", () => {
    for (const state of ["ON_TRACK", "NEUTRAL", "FAR_BEHIND"] as const)
      for (const format of ["DESKTOP", "MOBILE"] as const)
        expect(
          templates.some(
            (item) =>
              item.key === sceneTemplateKey({ chapter: 1, state, format }),
          ),
        ).toBe(true);
  });

  it("keeps the shared recipe when a Season supplies reference-sheet direction", () => {
    const result = assembleImagePromptPackage({
      ...base,
      variant: "reference-sheet",
      visualIntent: {
        feeling: "Warm reassurance",
        demeanor: "Open and attentive",
        anchors: "Recognizable face",
        atmosphere: "Welcoming afternoon",
        avoid: "Battle pose",
      },
      promptOverride: "Show the approved green jacket.",
    });
    expect(result.prompt).toContain("cinematic lighting");
    expect(result.prompt).toContain("wide visual reference sheet");
    expect(result.prompt).toContain("Show the approved green jacket.");
    expect(result.seasonOverride).toBe(true);
  });

  it("resolves saved intent, rules and visual-intent variables without changing legacy templates", () => {
    const visualIntent = {
      feeling: "Warm reassurance",
      demeanor: "Open and attentive",
      anchors: "Recognizable face",
      atmosphere: "Welcoming afternoon",
      avoid: "Battle pose",
    };
    const legacy = assembleImagePromptPackage({
      ...base,
      variant: "banner-desktop",
      visualIntent,
    });
    const structured = assembleImagePromptPackage({
      ...base,
      variant: "banner-desktop",
      visualIntent,
      templates: templates.map((template) =>
        template.key === "banner-desktop"
          ? {
              ...template,
              version: 2,
              text: `${template.text} Convey {{feeling}} in the expression.`,
              authoring: {
                intent:
                  "Make {{character}} feel true to the approved character.",
                variables: ["character", "feeling"],
                rules: ["Avoid {{avoid}}."],
              },
            }
          : template,
      ),
    });
    expect(legacy.prompt).not.toContain("banner-desktop intent:");
    expect(structured.prompt).toContain(
      "Convey Warm reassurance in the expression.",
    );
    expect(structured.prompt).toContain(
      "banner-desktop intent: Make Test Character feel true",
    );
    expect(structured.prompt).toContain("- Avoid Battle pose.");
    expect(structured.receipt).not.toBe(legacy.receipt);
  });
});
