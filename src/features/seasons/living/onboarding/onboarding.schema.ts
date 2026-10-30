import { z } from "zod";
import { livingCharacterProfileSchema } from "../schemas/living-season.schema";
import { visualIntentSchema } from "../image-direction/schemas/visual-intent.schema";

export const onboardingStageSchema = z.enum([
  "WORLD",
  "ASSEMBLING",
  "NEEDS_INPUT",
  "SUMMARY",
  "BANNER_PREPARATION",
  "GENERATING_BANNER",
  "BANNER",
  "PORTRAIT_PREPARATION",
  "GENERATING_PORTRAIT",
  "PORTRAIT",
  "SCENE_METHOD",
  "SCENE_PREPARATION",
  "GENERATING_SCENES",
  "SCENES",
  "READY",
  "ACTIVE",
]);
export type OnboardingStage = z.infer<typeof onboardingStageSchema>;
const locator = {
  year: z.number().int().min(2020).max(2200),
  quarter: z.number().int().min(1).max(4),
};
export const onboardingLocatorSchema = z.object(locator);
const command = {
  ...locator,
  expectedRevision: z.number().int().nonnegative(),
  operationKey: z.uuid(),
};
const review = {
  characterLikenessConfirmed: z.literal(true),
  mobileCharacterVisible: z.literal(true),
};
export const onboardingCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...command,
      action: z.literal("set-artwork-method"),
      target: z.enum(["BANNERS", "PORTRAIT"]),
      method: z.enum(["AI", "MANUAL"]),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("generate-artwork"),
      target: z.enum(["BANNERS", "PORTRAIT", "CHAPTER"]),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("review-artwork"),
      target: z.enum(["BANNERS", "PORTRAIT", "CHAPTER"]),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("open-artwork"),
      target: z.enum(["BANNERS", "PORTRAIT", "CHAPTER"]),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("select-scenes-method"),
      method: z.enum(["AI", "MANUAL"]),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("switch-scenes-method"),
      method: z.enum(["AI", "MANUAL"]),
      retention: z.enum(["KEEP", "DELETE"]),
    })
    .strict(),
  z.object({ ...command, action: z.literal("prepare") }).strict(),
  z
    .object({
      ...command,
      action: z.literal("save-world"),
      setting: z.string().trim().max(2000),
      visualDirection: z.string().trim().max(4000),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("start"),
      setting: z.string().trim().min(3).max(2000),
      visualDirection: z.string().trim().min(3).max(4000),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("correct"),
      correction: z.string().trim().min(3).max(4000),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("approve-summary"),
      sourceImageIds: z.array(z.string().min(1)).min(1).max(2),
      characterLikenessConfirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("approve-banner"),
      bannerRevision: z.number().int().positive(),
      ...review,
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("approve-portrait"),
      bannerRevision: z.number().int().positive(),
      characterLikenessConfirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("approve-chapter"),
      artworkIds: z.array(z.string().min(1)).length(6),
      ...review,
    })
    .strict(),
  z
    .object({
      ...command,
      action: z.literal("regenerate"),
      target: z.enum(["desktop", "phone", "avatar", "scene"]),
      artworkId: z.string().optional(),
    })
    .strict(),
  ...(["pause", "resume", "activate"] as const).map((action) =>
    z.object({ ...command, action: z.literal(action) }).strict(),
  ),
]);
export type OnboardingCommand = z.infer<typeof onboardingCommandSchema>;
export const onboardingDraftSchema = z
  .object({
    profile: livingCharacterProfileSchema,
    visualIntent: visualIntentSchema,
    summary: z.string().trim().min(100).max(6000),
    bannerCopy: z
      .object({
        quote: z.string().max(240),
        attribution: z.string().max(120),
        quoteSource: z.string().max(500),
        rightLine: z.string().min(1).max(100),
      })
      .strict(),
  })
  .strict();
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export const pendingImageSchema = z.object({
  sceneAttemptId: z.string().optional(),
  key: z.string().min(16).max(80),
  kind: z.enum(["desktop", "phone", "avatar", "scene"]),
  slot: z
    .object({
      chapter: z.number().int().min(1).max(7),
      state: z.enum(["ON_TRACK", "NEUTRAL", "FAR_BEHIND"]),
      format: z.enum(["DESKTOP", "MOBILE"]),
    })
    .optional(),
});
export const pendingImagesSchema = z.array(pendingImageSchema).max(6);

export function onboardingNextStage(
  stage: OnboardingStage,
  action: string,
  chapter: number,
): OnboardingStage {
  if (action === "approve-summary" && stage === "SUMMARY")
    return "BANNER_PREPARATION";
  if (action === "approve-banner" && stage === "BANNER")
    return "PORTRAIT_PREPARATION";
  if (action === "approve-portrait" && stage === "PORTRAIT")
    return "SCENE_METHOD";
  if (action === "approve-chapter" && stage === "SCENES")
    return chapter === 7 ? "READY" : "GENERATING_SCENES";
  if (action === "activate" && stage === "READY") return "ACTIVE";
  throw new Error("Review the current step before continuing.");
}

/** Durable preview state; never used by approval or activation validation. */
export const preparationProgressSchema = z.object({
  attempt: z.string(),
  startedAt: z.string().datetime(),
  phase: z.enum(["research", "writing", "checking"]),
  paragraphs: z.array(z.string().max(12000)).max(60),
  estimate: z
    .object({ minMs: z.number(), maxMs: z.number(), samples: z.number() })
    .nullable(),
});
export type PreparationProgress = z.infer<typeof preparationProgressSchema>;
