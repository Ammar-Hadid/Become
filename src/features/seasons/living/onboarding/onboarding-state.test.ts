import { describe, expect, it } from "vitest";
import {
  onboardingNextStage,
  onboardingCommandSchema,
} from "./onboarding.schema";
import { chooseImageReferences } from "../image-direction/utils/image-references.util";
import { onboardingProgress } from "./onboarding-progress.util";

describe("guided Season checkpoints", () => {
  it("counts completed approvals instead of the current unreviewed task", () => {
    expect(onboardingProgress("SUMMARY", 1)).toBe(1);
    expect(onboardingProgress("BANNER", 1)).toBe(2);
    expect(onboardingProgress("PORTRAIT", 1)).toBe(3);
    expect(onboardingProgress("SCENES", 1)).toBe(4);
    expect(onboardingProgress("GENERATING_SCENES", 7)).toBe(10);
    expect(onboardingProgress("READY", 7)).toBe(11);
    expect(onboardingProgress("ACTIVE", 7)).toBe(12);
  });
  it("requires explicit approvals before each expensive stage", () => {
    expect(onboardingNextStage("SUMMARY", "approve-summary", 1)).toBe(
      "BANNER_PREPARATION",
    );
    expect(onboardingNextStage("BANNER", "approve-banner", 1)).toBe(
      "PORTRAIT_PREPARATION",
    );
    expect(onboardingNextStage("PORTRAIT", "approve-portrait", 1)).toBe(
      "SCENE_METHOD",
    );
    expect(() =>
      onboardingNextStage("BANNER", "approve-portrait", 1),
    ).toThrow();
    expect(onboardingNextStage("SCENES", "approve-chapter", 1)).toBe(
      "GENERATING_SCENES",
    );
    expect(onboardingNextStage("SCENES", "approve-chapter", 7)).toBe("READY");
    expect(() =>
      onboardingNextStage("ASSEMBLING", "approve-summary", 1),
    ).toThrow();
    expect(() => onboardingNextStage("SUMMARY", "approve-banner", 1)).toThrow();
    expect(() => onboardingNextStage("BANNER", "activate", 1)).toThrow();
  });
  it("separates text preparation from required authentic-image approval", () => {
    const base = {
      year: 2026,
      quarter: 4,
      expectedRevision: 2,
      operationKey: "12345678-1234-4234-8234-123456789012",
    };
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        action: "start",
        setting: "A quiet city",
        visualDirection: "Morning light",
      }).success,
    ).toBe(true);
    expect(
      onboardingCommandSchema.safeParse({ ...base, action: "approve-summary" })
        .success,
    ).toBe(false);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        action: "approve-summary",
        sourceImageIds: [],
        characterLikenessConfirmed: true,
      }).success,
    ).toBe(false);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        action: "approve-summary",
        sourceImageIds: ["original"],
        characterLikenessConfirmed: false,
      }).success,
    ).toBe(false);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        action: "approve-summary",
        sourceImageIds: ["original"],
        characterLikenessConfirmed: true,
      }).success,
    ).toBe(true);
  });
  it("binds commands to a revision and rejects extra or missing approval information", () => {
    const base = {
      action: "approve-chapter",
      year: 2026,
      quarter: 4,
      expectedRevision: 2,
      operationKey: "12345678-1234-4234-8234-123456789012",
    };
    expect(onboardingCommandSchema.safeParse(base).success).toBe(false);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        artworkIds: ["a"],
        characterLikenessConfirmed: true,
        mobileCharacterVisible: true,
      }).success,
    ).toBe(false);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        artworkIds: ["a", "b", "c", "d", "e", "f"],
        characterLikenessConfirmed: true,
        mobileCharacterVisible: true,
      }).success,
    ).toBe(true);
    expect(
      onboardingCommandSchema.safeParse({
        ...base,
        action: "activate",
        expectedRevision: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("image reference modes", () => {
  const ref = (kind: string, id: string) => ({
    kind,
    id,
    storageKey: id,
    href: `/image/${id}`,
  });
  const originals = [
    ref("canonical-character", "original-1"),
    ref("canonical-character", "original-2"),
  ];
  it("keeps originals first and uses reviewed art within the four-image cap", () => {
    const refs = chooseImageReferences({
      mode: "ORIGINALS",
      variant: "scene-neutral-mobile",
      originals,
      portrait: ref("portrait", "portrait"),
      continuity: ref("previous-scene", "scene"),
      banner: ref("banner-phone", "banner"),
    });
    expect(refs.map((r) => r.id)).toEqual([
      "original-1",
      "original-2",
      "portrait",
      "scene",
    ]);
  });
  it("needs no generated art for the first banner but requires scene continuity", () => {
    expect(
      chooseImageReferences({
        mode: "ORIGINALS",
        variant: "banner-desktop",
        originals,
      }),
    ).toEqual(originals);
    expect(() =>
      chooseImageReferences({
        mode: "ORIGINALS",
        variant: "scene-neutral-desktop",
        originals,
      }),
    ).toThrow(/Approve/);
    expect(() =>
      chooseImageReferences({
        mode: "ORIGINALS",
        variant: "banner-desktop",
        originals: [],
      }),
    ).toThrow(/authentic/);
  });
  it("preserves the mandatory sheet behavior of existing packs", () => {
    expect(() =>
      chooseImageReferences({ mode: "SHEET", variant: "portrait", originals }),
    ).toThrow(/sheet/);
    expect(
      chooseImageReferences({
        mode: "SHEET",
        variant: "portrait",
        originals,
        sheet: ref("reference-sheet", "sheet"),
        banner: ref("banner-desktop", "banner"),
      }).map((r) => r.id),
    ).toEqual(["original-1", "original-2", "sheet", "banner"]);
  });
});
