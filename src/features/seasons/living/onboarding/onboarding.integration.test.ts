import "dotenv/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/nexo/services/ai-credential.service", () => ({
  getAiCredential: vi.fn(async () => "disposable-test-key"),
  getAiCredentialStatus: vi.fn(async () => ({
    openai: { available: true },
    google: { available: true },
    zai: { available: false },
    moonshot: { available: false },
  })),
}));
vi.mock("./onboarding-research.service", () => ({
  researchOnboardingCharacter: vi.fn(),
  assembleOnboardingDraft: vi.fn(),
  researchSchema: {
    safeParse: (value: unknown) =>
      value ? { success: true, data: value } : { success: false },
  },
}));
vi.mock("@/features/nexo/adapters/nexo-provider.adapter", () => ({
  executeNexoProvider: vi.fn(async (request: { input: string }) => {
    const context = JSON.parse(request.input) as { targets?: string[] };
    return {
      output: context.targets
        ? {
            directions: context.targets.map((key) => ({
              key,
              description: `For ${key}, compose the approved character in the established world with a restrained expression, recognizable appearance, consistent clothing and soft natural light. Develop the environment through concrete proposed details while preserving a quiet interface-copy area.`,
            })),
          }
        : {
            chapters: Array.from({ length: 7 }, (_, index) => ({
              chapter: index + 1,
              direction: `In chapter ${index + 1}, develop the same recognizable city through coherent, proposed environmental changes, retaining its existing landmarks and atmosphere.`,
            })),
          },
      usage: { inputTokens: 100, outputTokens: 500, reasoningTokens: 20 },
      providerRequestId: "fixture-prompt-writer",
    };
  }),
}));
vi.mock("../adapters/google-image.adapter", () => ({
  livingImageModel: "gemini-3.1-flash-image",
  generateGoogleLivingImage: vi.fn(),
}));
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { saveCotsIdentity } from "@/features/seasons/discovery/services/cots-identity.service";
import { uploadLivingSourceImage } from "../services/living-source-image.service";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { generateGoogleLivingImage } from "../adapters/google-image.adapter";
import {
  researchOnboardingCharacter,
  assembleOnboardingDraft,
} from "./onboarding-research.service";
import {
  commandSeasonOnboarding,
  getSeasonOnboarding,
  getSeasonOpeningOnboarding,
} from "./onboarding.service";
import { processSeasonOnboarding } from "./onboarding-worker.service";
import { getAiCredential } from "@/features/nexo/services/ai-credential.service";
import { resolveSeasonImagePackage } from "../image-direction/services/image-prompt-package.service";
import { executeNexoProvider } from "@/features/nexo/adapters/nexo-provider.adapter";
import { writeSeasonImagePrompts } from "../image-direction/services/image-prompt-writing.service";
import { uploadLivingArtwork } from "../services/living-season-pack.service";
import { uploadLivingBannerImage } from "../services/living-character-banner.service";
import { saveLivingBannerCrop } from "../services/living-character-banner.service";
import type { OnboardingDraft } from "./onboarding.schema";

const locator = { year: 2026, quarter: 4 };
const evidence = {
  id: "source",
  title: "Character evidence",
  url: "https://example.test/character",
  notes:
    "Reserved, expressive eyes and deliberate gestures. Uses measured language and supports deliberate recovery.",
};
const coverage = {
  scope: "The complete fixture story across its documented continuity.",
  endpoint: "The final published fixture chapter.",
  adaptationNotes:
    "Original-source development is labeled separately from the anime design.",
  early: {
    description: "Early restrained personality in the fixture story.",
    sourceIds: ["source"],
  },
  middle: {
    description: "Middle turning points in the fixture story.",
    sourceIds: ["source"],
  },
  late: {
    description: "Later development and ending in the fixture story.",
    sourceIds: ["source"],
  },
  gaps: [],
};
const draft = {
  profile: {
    coverage,
    characterName: "Fixture Character",
    sourceWork: "Fixture Work",
    adaptation: "TV anime",
    outputLanguage: "en",
    sources: [evidence],
    personality: {
      description: "Reserved and attentive.",
      sourceIds: ["source"],
    },
    speechPatterns: [
      { description: "Measured language", sourceIds: ["source"] },
    ],
    signaturePhrases: [],
    canonReferences: [],
    responseToSuccess: "Quiet acknowledgment of effort",
    responseToSetback: "Direct acknowledgment of difficulty",
    responseToRecovery: "Supports a deliberate next attempt",
    visualDirection: "Expressive eyes and recognizable uniform",
    visualBoundaries: "No invented identifying marks",
  },
  visualIntent: {
    productionBrief: {
      theme: "Earn freedom through sustained effort and preparation.",
      visualEra: "Keep one reviewed adolescent face, hairstyle and uniform.",
      worldRules:
        "Monumental walls, the same threatened gate and weathered masonry.",
      progression:
        "Seven stages of repaired defenses and reclaimed ground; stalled progress threatens the gates.",
      expressionRules:
        "Use measured resolve, restrained warmth, concern and deliberate recovery, not constant anger.",
    },
    ownerDirection: "Keep the full story and freedom theme.",
    feeling: "Quiet steady reassurance",
    demeanor: "Reserved but attentive",
    anchors: "Expressive eyes and recognizable uniform",
    atmosphere: "Soft natural afternoon light",
    avoid: "Exaggeration and generic angry expressions",
  },
  summary:
    "A reserved and attentive character who speaks in measured language [source]. Success receives quiet acknowledgment; setbacks receive direct acknowledgment, and recovery encourages a deliberate next attempt. The Season uses a lived-in city and soft natural afternoon light.",
  bannerCopy: {
    quote: "",
    attribution: "",
    quoteSource: "",
    rightLine: "A deliberate next attempt",
  },
} satisfies OnboardingDraft;

describe.skipIf(process.env.RUN_ONBOARDING_INTEGRATION !== "1")(
  "durable guided Season pipeline (no paid provider calls)",
  () => {
    let userId: string;
    let originalId: string;
    let concurrent = 0;
    let peak = 0;
    const command = async (
      action: string,
      fields: Record<string, unknown> = {},
    ) => {
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      return commandSeasonOnboarding(userId, {
        ...locator,
        action,
        expectedRevision: view.run?.revision ?? 0,
        operationKey: randomUUID(),
        ...(action === "approve-summary"
          ? { sourceImageIds: [originalId], characterLikenessConfirmed: true }
          : {}),
        ...fields,
      });
    };
    const start = () =>
      command("start", {
        setting: "A lived-in city",
        visualDirection: "Natural afternoon light",
      });
    beforeEach(async () => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error("Disposable fixtures require a local database.");
      userId = (
        await prisma.user.create({
          data: {
            email: `onboarding-${randomUUID()}@example.test`,
            name: "Disposable onboarding QA",
          },
        })
      ).id;
      vi.mocked(getAiCredential).mockResolvedValue("disposable-test-key");
      await prisma.nexoSettings.create({
        data: {
          userId,
          config: {
            schemaVersion: 1,
            profiles: [
              {
                id: "fixture",
                name: "Fixture only",
                provider: "openai",
                model: "fixture-model",
                reasoning: "medium",
                verbosity: "medium",
                maxOutputTokens: 16000,
                timeoutSeconds: 180,
              },
            ],
            assignments: [
              "cots.character-research",
              "cots.season-assembly",
              "cots.image-prompt-writing",
            ].map((taskId) => ({ taskId, profileId: "fixture" })),
            dailyRunLimit: 100,
          },
        },
      });
      await prisma.userSeason.create({
        data: { userId, ...locator, character: {}, answers: {} },
      });
      await saveCotsIdentity(userId, {
        ...locator,
        displayName: draft.profile.characterName,
        sourceCategory: "anime",
        sourceWork: draft.profile.sourceWork,
        adaptation: draft.profile.adaptation,
        expectedIdentityRevision: 0,
      });
      const bytes = await sharp({
        create: { width: 768, height: 768, channels: 3, background: "#889988" },
      })
        .webp()
        .toBuffer();
      originalId = (
        await uploadLivingSourceImage(
          userId,
          { ...locator, label: "Fixture authentic original" },
          bytes,
        )
      ).id;
      await command("prepare");
      vi.mocked(researchOnboardingCharacter)
        .mockReset()
        .mockResolvedValue({ coverage, sources: [evidence], question: null });
      vi.mocked(assembleOnboardingDraft)
        .mockReset()
        .mockResolvedValue({ draft, question: null });
      concurrent = peak = 0;
      vi.mocked(generateGoogleLivingImage)
        .mockReset()
        .mockImplementation(async (input) => {
          concurrent++;
          peak = Math.max(peak, concurrent);
          try {
            return await sharp({
              create: {
                width:
                  input.aspectRatio === "9:16"
                    ? 600
                    : input.aspectRatio === "1:1"
                      ? 768
                      : 1400,
                height:
                  input.aspectRatio === "9:16"
                    ? 1066
                    : input.aspectRatio === "1:1"
                      ? 768
                      : 600,
                channels: 3,
                background: "#889988",
              },
            })
              .webp()
              .toBuffer();
          } finally {
            concurrent--;
          }
        });
    });
    afterEach(async () => {
      const packs = await prisma.livingSeasonPack.findMany({
        where: { userId },
        include: { sourceImages: true, artwork: true },
      });
      const keys = packs.flatMap((p) =>
        [...p.sourceImages, ...p.artwork].map((a) => a.storageKey),
      );
      for (const p of packs) {
        const banner = (
          await import("../schemas/living-character-banner.schema")
        ).latestLivingBanner(p.characterBanner);
        for (const kind of ["desktop", "phone", "avatar"] as const)
          if (banner?.[kind]) keys.push(banner[kind]!.storageKey);
      }
      await prisma.user.delete({ where: { id: userId } });
      await Promise.all(
        keys.map((key) =>
          getMediaStorage()
            .remove(key)
            .catch(() => {}),
        ),
      );
    });
    it("concurrent first opening requests initialize one Season without failing", async () => {
      let requests: PromiseSettledResult<Awaited<ReturnType<typeof getSeasonOpeningOnboarding>>>[] = [];
      let pending: Promise<typeof requests> | undefined;
      await prisma.$transaction(async (tx) => {
        // Let every reader observe the absent Season before inserts can proceed.
        await tx.$executeRaw`LOCK TABLE "user_season" IN SHARE MODE`;
        pending = Promise.allSettled(Array.from({ length: 8 }, () => getSeasonOpeningOnboarding(userId, 2027, 1)));
        await expect.poll(async () => {
          const [locks] = await tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_locks WHERE relation = 'user_season'::regclass AND NOT granted`;
          return Number(locks.count);
        }).toBeGreaterThanOrEqual(8);
      });
      requests = await pending!;
      expect(requests.map((request) => request.status)).toEqual(Array(8).fill("fulfilled"));
      expect(await prisma.userSeason.count({ where: { userId, year: 2027, quarter: 1 } })).toBe(1);
    }, 15_000);

    it("opening entry initializes once and preserves existing identity, profile and run", async () => {
      const before = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      const existing = await getSeasonOpeningOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(existing).toEqual(before);
      const next = { year: 2027, quarter: 1 };
      const first = await getSeasonOpeningOnboarding(
        userId,
        next.year,
        next.quarter,
      );
      expect(first.pack.identity).toBeNull();
      expect(first.run).toBeNull();
      const saved = await prisma.userSeason.update({
        where: { userId_year_quarter: { userId, ...next } },
        data: {
          title: "Kept opening",
          intention: "Keep this intention",
          version: 4,
        },
      });
      await getSeasonOpeningOnboarding(userId, next.year, next.quarter);
      expect(
        await prisma.userSeason.findUnique({ where: { id: saved.id } }),
      ).toEqual(saved);
      expect(researchOnboardingCharacter).not.toHaveBeenCalled();
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    });

    it("researches, drafts, and waits for revision-bound approval without generating images", async () => {
      await start();
      await processSeasonOnboarding();
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(view.run?.stage).toBe("SUMMARY");
      expect(view.pack.originalsApproved).toBe(0);
      await expect(
        command("approve-summary", {
          sourceImageIds: ["wrong-identity-original"],
        }),
      ).rejects.toThrow(/authentic images/);
      expect(view.pack.profileApproved).toBe(false);
      expect(view.pack.visualIntent?.approved).toBe(false);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      const approval = {
        ...locator,
        action: "approve-summary",
        sourceImageIds: [originalId],
        characterLikenessConfirmed: true,
        expectedRevision: view.run!.revision,
        operationKey: randomUUID(),
      };
      const approved = await commandSeasonOnboarding(userId, approval);
      expect(approved.pack.originalsApproved).toBe(1);
      expect(approved.pack.profileApproved).toBe(true);
      expect(approved.pack.visualIntent?.approved).toBe(true);
      expect(
        (await commandSeasonOnboarding(userId, approval)).run?.revision,
      ).toBe(approved.run?.revision);
      await expect(
        commandSeasonOnboarding(userId, {
          ...approval,
          operationKey: randomUUID(),
        }),
      ).rejects.toThrow(/changed/);
      await expect(command("activate")).rejects.toThrow(/step/);
    });
    it("researches again for an owner correction instead of reusing narrow evidence", async () => {
      await start();
      await processSeasonOnboarding();
      const correction =
        "Cover the complete TV anime, including later seasons and the ending.";
      const revised = await command("correct", { correction });
      const stored = await prisma.seasonOnboardingRun.findUniqueOrThrow({
        where: { id: revised.run!.id },
      });
      expect(stored.research).toBeNull();
      await processSeasonOnboarding();
      expect(researchOnboardingCharacter).toHaveBeenCalledTimes(2);
      expect(researchOnboardingCharacter).toHaveBeenLastCalledWith(
        expect.objectContaining({ correction }),
      );
      const secondCorrection =
        "Keep the reviewed adolescent appearance throughout.";
      await command("correct", { correction: secondCorrection });
      await processSeasonOnboarding();
      expect(researchOnboardingCharacter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          correction: `${correction}\n\nLater owner correction (supersedes conflicts above):\n${secondCorrection}`,
        }),
      );
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("SUMMARY");
    });
    it("completes banner first and all seven reviewed chapters with at most two image calls", async () => {
      await start();
      await processSeasonOnboarding();
      await command("approve-summary");
      await command("generate-artwork", { target: "BANNERS" });
      await processSeasonOnboarding();
      await processSeasonOnboarding();
      let view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(view.run?.stage).toBe("BANNER");
      expect(generateGoogleLivingImage).toHaveBeenCalledTimes(2);
      expect(view.pack.banner?.avatarHref).toBeNull();
      expect(view.pack.banner?.approved).toBe(false);
      await command("approve-banner", {
        bannerRevision: view.pack.banner!.revision,
        characterLikenessConfirmed: true,
        mobileCharacterVisible: true,
      });
      view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
      expect(view.run?.stage).toBe("PORTRAIT_PREPARATION");
      await command("generate-artwork", { target: "PORTRAIT" });
      expect(generateGoogleLivingImage).toHaveBeenCalledTimes(2);
      await expect(
        command("approve-chapter", {
          artworkIds: ["1", "2", "3", "4", "5", "6"],
          characterLikenessConfirmed: true,
          mobileCharacterVisible: true,
        }),
      ).rejects.toThrow(/step/);
      await processSeasonOnboarding();
      view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
      expect(view.run?.stage).toBe("PORTRAIT");
      expect(view.pack.banner?.avatarHref).toBeTruthy();
      expect(view.pack.banner?.approved).toBe(false);
      expect(generateGoogleLivingImage).toHaveBeenCalledTimes(3);
      await saveLivingBannerCrop(userId, {
        ...locator,
        x: 0.3,
        y: 0.4,
        zoom: 1.2,
      });
      view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
      expect(view.pack.banner?.crop).toEqual({ x: 0.3, y: 0.4, zoom: 1.2 });
      await command("approve-portrait", {
        bannerRevision: view.pack.banner!.revision,
        characterLikenessConfirmed: true,
      });
      await command("select-scenes-method", { method: "AI" });
      for (let chapter = 1; chapter <= 7; chapter++) {
        for (let batch = 0; batch < 3; batch++) await processSeasonOnboarding();
        view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
        expect(view.run?.stage).toBe("SCENES");
        expect(view.run?.chapter).toBe(chapter);
        const slots = view.pack.slots.filter((s) => s.chapter === chapter);
        expect(slots.every((s) => s.latestId && !s.latestApproved)).toBe(true);
        const scene = await resolveSeasonImagePackage(
          userId,
          locator.year,
          locator.quarter,
          {
            variant: "scene-neutral-desktop",
            slot: { chapter, state: "NEUTRAL", format: "DESKTOP" },
          },
        );
        expect(scene.references[0].kind).toBe("canonical-character");
        expect(scene.references.some((r) => r.kind === "reference-sheet")).toBe(
          false,
        );
        expect(scene.receipt).toBe(
          slots.find((s) => s.state === "NEUTRAL" && s.format === "DESKTOP")!
            .promptPackage!.receipt,
        );
        await command("approve-chapter", {
          artworkIds: slots.map((s) => s.latestId),
          characterLikenessConfirmed: true,
          mobileCharacterVisible: true,
        });
      }
      view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
      expect(view.run?.stage).toBe("READY");
      expect(view.pack.approvedCount).toBe(42);
      expect(view.pack.imageReservedEurCents).toBe(765);
      expect(generateGoogleLivingImage).toHaveBeenCalledTimes(45);
      expect(peak).toBeLessThanOrEqual(2);
      expect((await command("activate")).run?.stage).toBe("ACTIVE");
    }, 60000);
    async function manualOpening() {
      await start();
      await processSeasonOnboarding();
      await command("approve-summary");
      await command("set-artwork-method", {
        target: "BANNERS",
        method: "MANUAL",
      });
      for (const bannerKind of ["desktop", "phone", "avatar"] as const) {
        if (bannerKind === "avatar")
          await command("set-artwork-method", {
            target: "PORTRAIT",
            method: "MANUAL",
          });
        const view = await getSeasonOnboarding(
          userId,
          locator.year,
          locator.quarter,
        );
        const image = await sharp({
          create: {
            width:
              bannerKind === "phone"
                ? 600
                : bannerKind === "avatar"
                  ? 768
                  : 1400,
            height:
              bannerKind === "phone"
                ? 1066
                : bannerKind === "avatar"
                  ? 768
                  : 600,
            channels: 3,
            background: "#889988",
          },
        })
          .webp()
          .toBuffer();
        await uploadLivingBannerImage(
          userId,
          {
            ...locator,
            bannerKind,
            expectedRevision: view.run!.revision,
            operationKey: randomUUID(),
          },
          image,
        );
        if (bannerKind === "phone" || bannerKind === "avatar") {
          await command("review-artwork", {
            target: bannerKind === "phone" ? "BANNERS" : "PORTRAIT",
          });
          const reviewed = await getSeasonOnboarding(
            userId,
            locator.year,
            locator.quarter,
          );
          await command(
            bannerKind === "phone" ? "approve-banner" : "approve-portrait",
            {
              bannerRevision: reviewed.pack.banner!.revision,
              characterLikenessConfirmed: true,
              ...(bannerKind === "phone"
                ? { mobileCharacterVisible: true }
                : {}),
            },
          );
        }
      }
      return command("select-scenes-method", { method: "MANUAL" });
    }
    async function manualChapter(chapter: number) {
      let view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      for (const slot of view.pack.slots.filter((s) => s.chapter === chapter)) {
        const image = await sharp({
          create: {
            width: slot.format === "MOBILE" ? 600 : 1200,
            height: slot.format === "MOBILE" ? 1066 : 675,
            channels: 3,
            background: "#889988",
          },
        })
          .webp()
          .toBuffer();
        await uploadLivingArtwork(
          userId,
          {
            ...locator,
            slot: { chapter, state: slot.state, format: slot.format },
            sceneAttemptId: view.pack.creation.activeAttemptId,
            expectedRevision: view.run!.revision,
            operationKey: randomUUID(),
          },
          image,
        );
        view = await getSeasonOnboarding(userId, locator.year, locator.quarter);
      }
      await command("review-artwork", { target: "CHAPTER" });
      return command("approve-chapter", {
        artworkIds: view.pack.slots
          .filter((s) => s.chapter === chapter)
          .map((s) => s.latestId),
        characterLikenessConfirmed: true,
        mobileCharacterVisible: true,
      });
    }
    it("uploads and reviews all 42 manual scenes, restores Chapter 5 after switching and activates only the selected pack", async () => {
      const initial = await manualOpening();
      const manualId = initial.pack.creation.activeAttemptId;
      for (let chapter = 1; chapter <= 4; chapter++)
        await manualChapter(chapter);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      const ai = await command("switch-scenes-method", {
        method: "AI",
        retention: "KEEP",
      });
      expect(ai.pack.creation.activeAttemptId).not.toBe(manualId);
      expect(ai.pack.approvedCount).toBe(0);
      const restored = await command("switch-scenes-method", {
        method: "MANUAL",
        retention: "KEEP",
      });
      expect(restored.pack.creation.activeAttemptId).toBe(manualId);
      expect(restored.pack.approvedCount).toBe(24);
      expect(restored.run?.chapter).toBe(5);
      for (let chapter = 5; chapter <= 7; chapter++)
        await manualChapter(chapter);
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("READY");
      const active = await command("activate");
      expect(active.pack.approvedCount).toBe(42);
      const savedPack = await prisma.livingSeasonPack.findUniqueOrThrow({
        where: { id: active.pack.packId! },
      });
      expect(
        (savedPack.activeSnapshot as { activatedArtworkIds: string[] })
          .activatedArtworkIds,
      ).toHaveLength(42);
      expect(
        (
          await prisma.livingSceneAttempt.findUniqueOrThrow({
            where: { id: ai.pack.creation.activeAttemptId! },
          })
        ).status,
      ).toBe("DISCARDED");
      expect(active.pack.imageReservedEurCents).toBe(0);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    }, 60000);
    it("carries the full approved brief into banners, portrait and all 42 scene packages with zero image calls", async () => {
      await manualOpening();
      vi.mocked(executeNexoProvider).mockClear();
      const groups = [
        { group: "BANNERS" as const },
        { group: "PORTRAIT" as const },
        ...Array.from({ length: 7 }, (_, i) => ({
          group: "CHAPTER" as const,
          chapter: i + 1,
        })),
      ];
      let count = 0;
      for (const group of groups) {
        const batch = await writeSeasonImagePrompts(userId, {
          ...locator,
          ...group,
          operationKey: randomUUID(),
        });
        const content = batch.content as { directions: { key: string }[] };
        for (const { key } of content.directions) {
          const state = key.includes("on-track")
            ? "ON_TRACK"
            : key.includes("far-behind")
              ? "FAR_BEHIND"
              : "NEUTRAL";
          const result = await resolveSeasonImagePackage(
            userId,
            locator.year,
            locator.quarter,
            {
              variant: key as "portrait",
              batchId: batch.id,
              ...(group.group === "CHAPTER"
                ? {
                    slot: {
                      chapter: group.chapter,
                      state,
                      format: key.endsWith("mobile") ? "MOBILE" : "DESKTOP",
                    },
                  }
                : {}),
            },
          );
          expect(result.prompt).toContain(
            draft.visualIntent.productionBrief.theme,
          );
          expect(result.prompt).toContain(
            draft.visualIntent.productionBrief.visualEra,
          );
          expect(result.prompt).toContain(
            draft.profile.personality.description,
          );
          expect(result.prompt).toContain(draft.profile.responseToSetback);
          expect(result.references[0].kind).toBe("canonical-character");
          count++;
        }
      }
      expect(count).toBe(45);
      for (const [request] of vi.mocked(executeNexoProvider).mock.calls) {
        const input = JSON.parse(request.input);
        expect(input.profile).toEqual(draft.profile);
        expect(input.visualIntent.productionBrief).toEqual(
          draft.visualIntent.productionBrief,
        );
        expect(input.visualIntent.ownerDirection).toBe(
          draft.visualIntent.ownerDirection,
        );
      }
      expect(vi.mocked(executeNexoProvider).mock.calls).toHaveLength(10);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).pack
          .imageReservedEurCents,
      ).toBe(0);
    }, 60000);
    it("caches authored prompts and rejects stale revisions without making image calls", async () => {
      await manualOpening();
      const before = vi.mocked(executeNexoProvider).mock.calls.length;
      const first = await writeSeasonImagePrompts(userId, {
        ...locator,
        group: "CHAPTER",
        chapter: 1,
        operationKey: randomUUID(),
        regenerate: false,
      });
      const second = await writeSeasonImagePrompts(userId, {
        ...locator,
        group: "CHAPTER",
        chapter: 1,
        operationKey: randomUUID(),
        regenerate: false,
      });
      expect(second.id).toBe(first.id);
      expect(vi.mocked(executeNexoProvider).mock.calls.length - before).toBe(2);
      const slot = {
        chapter: 1,
        state: "NEUTRAL" as const,
        format: "DESKTOP" as const,
      };
      const prompt = await resolveSeasonImagePackage(
        userId,
        locator.year,
        locator.quarter,
        { variant: "scene-neutral-desktop", slot, batchId: first.id },
      );
      const repeated = await resolveSeasonImagePackage(
        userId,
        locator.year,
        locator.quarter,
        {
          variant: "scene-neutral-desktop",
          slot,
          batchId: first.id,
          receipt: prompt.receipt,
        },
      );
      expect(repeated.prompt).toBe(prompt.prompt);
      expect(prompt.authorship?.nexoRunId).toBeTruthy();
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      const bytes = await sharp({
        create: {
          width: 1200,
          height: 675,
          channels: 3,
          background: "#889988",
        },
      })
        .webp()
        .toBuffer();
      const upload = {
        ...locator,
        slot,
        sceneAttemptId: view.pack.creation.activeAttemptId,
        promptBatchId: first.id,
        promptReceipt: prompt.receipt,
        expectedRevision: view.run!.revision,
        operationKey: randomUUID(),
      };
      const saved = await uploadLivingArtwork(userId, upload, bytes);
      expect((await uploadLivingArtwork(userId, upload, bytes)).id).toBe(
        saved.id,
      );
      await expect(
        uploadLivingArtwork(
          userId,
          { ...upload, operationKey: randomUUID() },
          bytes,
        ),
      ).rejects.toThrow(/changed/);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    }, 30000);
    it("keeps late provider results on the original attempt and preserves spending when discarded", async () => {
      const manual = await manualOpening();
      await command("switch-scenes-method", {
        method: "AI",
        retention: "KEEP",
      });
      const ai = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      const releases: Array<() => void> = [];
      vi.mocked(generateGoogleLivingImage).mockImplementation(
        async (input) =>
          new Promise((resolve) => {
            releases.push(() => {
              void sharp({
                create: {
                  width: input.aspectRatio === "9:16" ? 600 : 1400,
                  height: input.aspectRatio === "9:16" ? 1066 : 600,
                  channels: 3,
                  background: "#889988",
                },
              })
                .webp()
                .toBuffer()
                .then(resolve);
            });
          }),
      );
      const worker = processSeasonOnboarding();
      await vi.waitFor(() => expect(releases).toHaveLength(2));
      await command("switch-scenes-method", {
        method: "MANUAL",
        retention: "KEEP",
      });
      expect(await processSeasonOnboarding()).toBe(false);
      for (const release of releases) release();
      await worker;
      const current = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(current.pack.creation.activeAttemptId).toBe(
        manual.pack.creation.activeAttemptId,
      );
      expect(current.pack.slots.every((slot) => !slot.latestId)).toBe(true);
      expect(
        await prisma.livingSeasonArtwork.count({
          where: { userId, sceneAttemptId: ai.pack.creation.activeAttemptId },
        }),
      ).toBe(2);
      expect(current.pack.imageReservedEurCents).toBe(34);
      await command("switch-scenes-method", {
        method: "AI",
        retention: "KEEP",
      });
      await command("switch-scenes-method", {
        method: "MANUAL",
        retention: "DELETE",
      });
      expect(
        await prisma.livingSeasonArtwork.count({
          where: { userId, sceneAttemptId: ai.pack.creation.activeAttemptId },
        }),
      ).toBe(0);
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).pack
          .imageReservedEurCents,
      ).toBe(34);
      expect(generateGoogleLivingImage).toHaveBeenCalledTimes(2);
    }, 30000);
    it("records failed prompt writing and never labels a template as AI-authored", async () => {
      await manualOpening();
      vi.mocked(executeNexoProvider).mockRejectedValueOnce(
        new Error("Fixture writer unavailable"),
      );
      await expect(
        writeSeasonImagePrompts(userId, {
          ...locator,
          group: "CHAPTER",
          chapter: 1,
          operationKey: randomUUID(),
        }),
      ).rejects.toThrow();
      expect(
        await prisma.livingImagePromptBatch.count({
          where: { userId, status: "FAILED" },
        }),
      ).toBe(1);
      expect(
        (
          await getSeasonOnboarding(userId, locator.year, locator.quarter)
        ).pack.slots.every((slot) => !slot.promptPackage),
      ).toBe(true);
      const retried = await writeSeasonImagePrompts(userId, {
        ...locator,
        group: "CHAPTER",
        chapter: 1,
        operationKey: randomUUID(),
      });
      expect(retried.status).toBe("READY");
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    }, 30000);
    it("keeps failed image reservations and needs an explicit retry rather than resume", async () => {
      await start();
      await processSeasonOnboarding();
      await command("approve-summary");
      await command("generate-artwork", { target: "BANNERS" });
      vi.mocked(generateGoogleLivingImage).mockRejectedValueOnce(
        new Error("Provider failed"),
      );
      await processSeasonOnboarding();
      const failed = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(failed.run?.status).toBe("FAILED");
      expect(failed.pack.imageReservedEurCents).toBe(17);
      await expect(command("resume")).rejects.toThrow(/may have been billed/);
      await command("regenerate", { target: "desktop" });
      await processSeasonOnboarding();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).pack
          .imageReservedEurCents,
      ).toBe(34);
    });
    it("pauses queued work across worker restarts and asks one missing-evidence question", async () => {
      await start();
      await command("pause");
      expect(await processSeasonOnboarding()).toBe(false);
      await command("resume");
      vi.mocked(researchOnboardingCharacter).mockResolvedValueOnce({
        coverage: {
          ...coverage,
          gaps: ["Adaptation-specific evidence is missing."],
        },
        sources: [],
        question: "Which adaptation-specific source should I use?",
      });
      await processSeasonOnboarding();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("NEEDS_INPUT");
      expect(assembleOnboardingDraft).not.toHaveBeenCalled();
      await command("correct", {
        correction: "Use the TV anime version and its official guide.",
      });
      await processSeasonOnboarding();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("SUMMARY");
    });
    it("saves World corrections after a failed assembly and recovers across reads", async () => {
      await start();
      vi.mocked(researchOnboardingCharacter).mockRejectedValueOnce(
        new Error("Fixture unavailable provider"),
      );
      await processSeasonOnboarding();
      const saved = await command("save-world", {
        setting: "A corrected observatory",
        visualDirection: "Warm light",
      });
      expect(saved.run).toMatchObject({
        stage: "WORLD",
        status: "WAITING",
        error: null,
      });
      const recovered = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(recovered.pack.setting).toBe("A corrected observatory");
      expect(recovered.pack.visualBrief).toBe("Warm light");
      expect(researchOnboardingCharacter).toHaveBeenCalledTimes(1);
    });
    it("rejects a changed profile before summary approval", async () => {
      await start();
      await processSeasonOnboarding();
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      await prisma.livingSeasonPack.update({
        where: { id: view.pack.packId! },
        data: { briefRevision: { increment: 1 } },
      });
      await expect(command("approve-summary")).rejects.toThrow(/brief changed/);
    });
    it("stops before a provider call at the €15 cap", async () => {
      await start();
      await processSeasonOnboarding();
      await command("approve-summary");
      await command("generate-artwork", { target: "BANNERS" });
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      await prisma.livingSeasonImageRun.create({
        data: {
          userId,
          packId: view.pack.packId!,
          chapter: 0,
          state: "BANNER",
          format: "DESKTOP",
          resolution: "2K",
          provider: "google",
          model: "fixture",
          prompt: "Fixture budget history",
          reservedEurCents: 1496,
          status: "COMPLETED",
        },
      });
      await processSeasonOnboarding();
      const failed = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(failed.run?.status).toBe("FAILED");
      expect(failed.run?.error).toContain("€15");
      expect(failed.pack.imageReservedEurCents).toBe(1496);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      await command("open-artwork", { target: "BANNERS" });
      const manual = await command("set-artwork-method", {
        target: "BANNERS",
        method: "MANUAL",
      });
      expect(manual.run).toMatchObject({
        stage: "BANNER_PREPARATION",
        status: "WAITING",
        bannerMethod: "MANUAL",
      });
      expect(manual.pack.imageReservedEurCents).toBe(1496);
    });
    it("claims a run once across concurrent workers and preserves paused in-flight work", async () => {
      await start();
      let resolveResearch!: (value: {
        coverage: typeof coverage;
        sources: (typeof evidence)[];
        question: null;
      }) => void;
      vi.mocked(researchOnboardingCharacter).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveResearch = resolve;
          }),
      );
      const first = processSeasonOnboarding();
      await vi.waitFor(() => expect(resolveResearch).toBeTypeOf("function"));
      expect(await processSeasonOnboarding()).toBe(false);
      await command("pause");
      resolveResearch({ coverage, sources: [evidence], question: null });
      await first;
      const paused = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(paused.run?.status).toBe("PAUSED");
      expect(paused.run?.stage).toBe("ASSEMBLING");
      expect(assembleOnboardingDraft).not.toHaveBeenCalled();
      await command("resume");
      await processSeasonOnboarding();
      expect(researchOnboardingCharacter).toHaveBeenCalledTimes(1);
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("SUMMARY");
    });
    it("explains missing credentials before queueing and preserves the world draft", async () => {
      vi.mocked(getAiCredential).mockResolvedValue(null);
      await expect(start()).rejects.toThrow(/Settings → Nexo/);
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(view.run?.stage).toBe("WORLD");
      expect(researchOnboardingCharacter).not.toHaveBeenCalled();
      expect(await prisma.nexoRun.count({ where: { userId } })).toBe(0);
    });
    it("reports an absent worker on refresh and resumes only after explicit retry", async () => {
      const queued = await start();
      await prisma.seasonOnboardingRun.update({
        where: { id: queued.run!.id },
        data: { updatedAt: new Date(Date.now() - 60000) },
      });
      const failed = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(failed.run?.status).toBe("FAILED");
      expect(failed.run?.error).toContain("pnpm worker:seasons");
      expect(await processSeasonOnboarding()).toBe(false);
      await command("resume");
      await processSeasonOnboarding();
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("SUMMARY");
    });
    it.each(["SUMMARY", "NEEDS_INPUT"] as const)(
      "keeps a completed %s assembly during pause without buying another text call",
      async (stage) => {
        await start();
        let finish!: (
          result: Awaited<ReturnType<typeof assembleOnboardingDraft>>,
        ) => void;
        vi.mocked(assembleOnboardingDraft).mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            }),
        );
        const worker = processSeasonOnboarding();
        await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
        await command("pause");
        finish(
          stage === "SUMMARY"
            ? { draft, question: null }
            : {
                draft: null,
                question: "Which source supports the appearance?",
              },
        );
        await worker;
        const saved = await getSeasonOnboarding(
          userId,
          locator.year,
          locator.quarter,
        );
        expect(saved.run).toMatchObject({ stage, status: "PAUSED" });
        await command("resume");
        expect(await processSeasonOnboarding()).toBe(false);
        expect(assembleOnboardingDraft).toHaveBeenCalledTimes(1);
      },
    );
    it("persists arriving paragraphs before completion without making the draft approvable", async () => {
      const view = await start();
      vi.mocked(assembleOnboardingDraft).mockImplementationOnce(
        async (input) => {
          await input.onTextSnapshot?.(
            '{"draft":{"summary":"A saved paragraph.\\n\\nStill writing',
          );
          const pending = await getSeasonOnboarding(
            userId,
            locator.year,
            locator.quarter,
          );
          expect(pending.run).toMatchObject({
            stage: "ASSEMBLING",
            status: "RUNNING",
            preparationProgress: {
              phase: "writing",
              paragraphs: ["A saved paragraph."],
            },
          });
          await expect(command("approve-summary")).rejects.toThrow();
          await command("pause");
          await input.onTextSnapshot?.(
            '{"draft":{"summary":"A saved paragraph.\\n\\nStill writing."',
          );
          const paused = await prisma.seasonOnboardingRun.findUniqueOrThrow({
            where: { id: view.run!.id },
          });
          expect(paused.status).toBe("PAUSED");
          expect(paused.preparationProgress).toMatchObject({
            paragraphs: ["A saved paragraph.", "Still writing."],
          });
          return { draft, question: null };
        },
      );
      await processSeasonOnboarding();
      const saved = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(saved.run).toMatchObject({ stage: "SUMMARY", status: "PAUSED" });
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    });
    it("revalidates a retained citation-check rejection without another provider call", async () => {
      const actual = await vi.importActual<
        typeof import("./onboarding-research.service")
      >("./onboarding-research.service");
      const view = await start();
      const input = {
        userId,
        runId: view.run!.id,
        revision: 1,
        identity: {
          displayName: draft.profile.characterName,
          sourceWork: draft.profile.sourceWork,
          adaptation: draft.profile.adaptation,
        },
        setting: "A lived-in city",
        visualDirection: "Natural afternoon light",
        correction: "",
        research: { coverage, sources: [evidence], question: null },
        existingDraft: null,
      };
      const output = {
        draft: {
          ...draft,
          visualIntent: Object.fromEntries(
            Object.entries(draft.visualIntent).filter(
              ([key]) => key !== "ownerDirection",
            ),
          ),
        },
        question: null,
      };
      vi.mocked(executeNexoProvider).mockResolvedValueOnce({
        output,
        usage: { inputTokens: 40, outputTokens: 80, reasoningTokens: 0 },
        providerRequestId: "original",
      });
      await actual.assembleOnboardingDraft(input);
      const original = await prisma.nexoRun.findFirstOrThrow({
        where: { userId, taskId: "cots.season-assembly" },
      });
      await prisma.nexoRun.update({
        where: { id: original.id },
        data: {
          status: "FAILED",
          error:
            "The character or production brief ends mid-sentence. Retry with concise complete prose before approval; saved work is preserved.",
        },
      });
      const calls = vi.mocked(executeNexoProvider).mock.calls.length;
      expect(
        (await actual.assembleOnboardingDraft({ ...input, revision: 2 })).draft
          ?.summary,
      ).toBe(draft.summary);
      expect(executeNexoProvider).toHaveBeenCalledTimes(calls);
      const recovery = await prisma.nexoRun.findFirstOrThrow({
        where: { userId, status: "READY" },
      });
      expect(recovery.usage).toMatchObject({
        recoveredFromRunId: original.id,
        estimatedCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
      expect(
        (await prisma.nexoRun.findUniqueOrThrow({ where: { id: original.id } }))
          .status,
      ).toBe("FAILED");
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    });
    it("runs real research and assembly validation through Nexo with provider fixtures", async () => {
      const actual = await vi.importActual<
        typeof import("./onboarding-research.service")
      >("./onboarding-research.service");
      vi.mocked(researchOnboardingCharacter).mockImplementationOnce(
        actual.researchOnboardingCharacter,
      );
      vi.mocked(assembleOnboardingDraft).mockImplementationOnce(
        actual.assembleOnboardingDraft,
      );
      vi.mocked(executeNexoProvider)
        .mockResolvedValueOnce({
          output: { coverage, sources: [evidence], question: null },
          usage: { inputTokens: 20, outputTokens: 40, reasoningTokens: 10 },
          sources: [{ url: evidence.url, title: evidence.title }],
          searchCalls: 1,
          providerRequestId: "fixture-research",
        })
        .mockResolvedValueOnce({
          output: {
            draft: {
              ...draft,
              visualIntent: Object.fromEntries(
                Object.entries(draft.visualIntent).filter(
                  ([key]) => key !== "ownerDirection",
                ),
              ),
            },
            question: null,
          },
          usage: { inputTokens: 40, outputTokens: 80, reasoningTokens: 10 },
          providerRequestId: "fixture-assembly",
        });
      await start();
      await processSeasonOnboarding();
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(view.run?.stage).toBe("SUMMARY");
      const runs = await prisma.nexoRun.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      expect(runs.map((run) => [run.taskId, run.status])).toEqual([
        ["cots.character-research", "READY"],
        ["cots.season-assembly", "READY"],
      ]);
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
      await command("approve-summary");
      await writeSeasonImagePrompts(userId, {
        ...locator,
        group: "BANNERS",
        operationKey: randomUUID(),
      });
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.stage,
      ).toBe("BANNER_PREPARATION");
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    });
    it("retains rejected provider output with bounded field diagnostics and never generates artwork", async () => {
      await manualOpening();
      vi.mocked(executeNexoProvider).mockResolvedValueOnce({
        output: { chapters: [] },
        usage: { inputTokens: 10, outputTokens: 10, reasoningTokens: 0 },
        providerRequestId: "invalid-fixture",
      });
      await expect(
        writeSeasonImagePrompts(userId, {
          ...locator,
          group: "BANNERS",
          operationKey: randomUUID(),
        }),
      ).rejects.toThrow(/chapters.*too_small/);
      const failure = await prisma.nexoRun.findFirstOrThrow({
        where: { userId, status: "FAILED" },
      });
      expect(failure.output).toEqual({ chapters: [] });
      expect(failure.usage).toMatchObject({
        validationIssues: [{ path: "chapters", code: "too_small" }],
      });
      expect(generateGoogleLivingImage).not.toHaveBeenCalled();
    });
    it("recovers an expired job from a page read even when no worker is running", async () => {
      const view = await start();
      await prisma.seasonOnboardingRun.update({
        where: { id: view.run!.id },
        data: {
          status: "RUNNING",
          leaseToken: randomUUID(),
          leaseUntil: new Date(Date.now() - 1000),
        },
      });
      const expired = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      expect(expired.run?.status).toBe("FAILED");
      expect(expired.run?.error).toContain(
        "no call was automatically repeated",
      );
      expect(await processSeasonOnboarding()).toBe(false);
    });
    it("pauses expired leases instead of replaying a provider call after restart", async () => {
      await start();
      const view = await getSeasonOnboarding(
        userId,
        locator.year,
        locator.quarter,
      );
      await prisma.seasonOnboardingRun.update({
        where: { id: view.run!.id },
        data: {
          status: "RUNNING",
          leaseToken: randomUUID(),
          leaseUntil: new Date(Date.now() - 1000),
        },
      });
      expect(await processSeasonOnboarding()).toBe(false);
      expect(
        (await getSeasonOnboarding(userId, locator.year, locator.quarter)).run
          ?.status,
      ).toBe("FAILED");
      expect(researchOnboardingCharacter).not.toHaveBeenCalled();
    });
  },
);
