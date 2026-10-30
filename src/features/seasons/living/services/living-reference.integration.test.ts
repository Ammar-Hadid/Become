import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { saveCotsIdentity } from "@/features/seasons/discovery/services/cots-identity.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  saveLivingCharacterProfile,
  saveLivingSeasonSetup,
} from "./living-season-pack.service";
import { reviewLivingSourceImage } from "./living-source-image.service";
import {
  approveLivingBanner,
  saveLivingBannerCopy,
  saveLivingBannerCrop,
} from "./living-character-banner.service";
import { resolveSeasonImagePackage } from "../image-direction/services/image-prompt-package.service";
import {
  saveLivingVisualIntent,
  approveLivingVisualIntent,
} from "../image-direction/services/visual-intent.service";
import {
  getLivingSeasonPack,
  getLivingSeasonScene,
} from "../queries/living-season.query";
import { livingArtworkSlots } from "../utils/living-artwork-prompt.util";
import { visualBriefFingerprint } from "../image-direction/utils/visual-intent.util";
import type { LivingCharacterProfile } from "../schemas/living-season.schema";

const enabled = process.env.RUN_LIVING_INTEGRATION === "1";
const locator = { year: 2026, quarter: 4 };
const profile: LivingCharacterProfile = {
  characterName: "Fixture Character",
  sourceWork: "Fixture Work",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    {
      id: "source",
      title: "Reviewed source",
      notes:
        "A source describing expressive eyes, reserved language and deliberate gestures.",
    },
  ],
  speechPatterns: [{ description: "Measured language", sourceIds: ["source"] }],
  signaturePhrases: [],
  canonReferences: [],
  responseToSuccess: "Quiet acknowledgment of effort",
  responseToSetback: "Direct acknowledgment of the difficulty",
  responseToRecovery: "Supports a deliberate next attempt",
  visualDirection: "Expressive eyes and a recognizable uniform",
  visualBoundaries: "No unrelated costume or invented identifying marks",
};
const intent = {
  feeling: "Quiet steady reassurance",
  demeanor: "Reserved but attentive",
  anchors: "Expressive eyes and recognizable uniform",
  atmosphere: "Soft natural afternoon light",
  avoid: "Exaggeration and generic angry expressions",
};
describe.skipIf(!enabled)("owned local character reference pipeline", () => {
  let userId: string, seasonId: string, packId: string, identityId: string;
  beforeEach(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error("Local database required");
    userId = (
      await prisma.user.create({
        data: {
          email: `living-reference-${randomUUID()}@example.test`,
          name: "Disposable reference QA",
        },
      })
    ).id;
    seasonId = (
      await prisma.userSeason.create({
        data: {
          userId,
          ...locator,
          character: { name: "Fixture Character" },
          answers: {},
        },
      })
    ).id;
    const result = await saveCotsIdentity(userId, {
      ...locator,
      displayName: profile.characterName,
      sourceCategory: "anime",
      sourceWork: profile.sourceWork,
      adaptation: profile.adaptation,
      expectedIdentityRevision: 0,
    });
    identityId = result.identity!.id;
    await saveLivingSeasonSetup(userId, {
      ...locator,
      setting: "A lived-in city",
      visualBrief: "Soft natural light and responsive scenery",
    });
    const saved = await saveLivingCharacterProfile(userId, {
      ...locator,
      profile,
    });
    packId = saved.packId;
    await prisma.livingSeasonProfile.update({
      where: { id: saved.id },
      data: { approvedAt: new Date() },
    });
    const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
      where: { id: packId },
    });
    await prisma.livingVisualIntent.create({
      data: {
        userId,
        packId,
        identityId,
        profileVersion: saved.version,
        briefFingerprint: visualBriefFingerprint(
          identityId,
          saved.version,
          pack.setting,
          pack.visualBrief,
        ),
        version: 1,
        content: intent,
        approvedAt: new Date(),
      },
    });
  });
  afterEach(async () => {
    if (userId) {
      await prisma.userSeason.deleteMany({ where: { userId } });
      await prisma.imageDirectionTemplateVersion.deleteMany({
        where: { userId },
      });
      await prisma.user.delete({ where: { id: userId } });
    }
  });
  async function source(adaptation = profile.adaptation) {
    return prisma.livingSeasonSourceImage.create({
      data: {
        userId,
        packId,
        identityId,
        adaptation,
        label: "Authentic fixture source",
        storageKey: `fixture/${randomUUID()}.webp`,
        width: 400,
        height: 600,
      },
    });
  }
  it.each(["copy", "crop", "approval"] as const)(
    "rejects a banner %s edit when the Season closes after its initial read",
    async (kind) => {
      const openSeason = await prisma.userSeason.findUniqueOrThrow({
        where: { id: seasonId },
      });
      const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
        where: { id: packId },
      });
      const asset = {
        storageKey: "fixture/banner.webp",
        prompt: "",
        width: 1000,
        height: 1000,
      };
      const before = await prisma.livingSeasonPack.update({
        where: { id: packId },
        data: {
          characterBanner: {
            revisions: [
              {
                revision: 1,
                identityId,
                profileVersion: 1,
                briefRevision: pack.briefRevision,
                desktop: asset,
                phone: asset,
                avatar: asset,
                rightLine: "A deliberate next attempt",
              },
            ],
          },
        },
      });
      await prisma.userSeason.update({
        where: { id: seasonId },
        data: { closedAt: new Date() },
      });
      // Reproduce the request's open-Season snapshot becoming stale before its
      // transaction starts. The transactional read must still see the closure.
      const lookup = vi
        .spyOn(prisma.userSeason, "findUnique")
        .mockResolvedValueOnce(openSeason);
      try {
        const save =
          kind === "approval"
            ? approveLivingBanner(userId, {
                ...locator,
                characterLikenessConfirmed: true,
              })
            : kind === "crop"
              ? saveLivingBannerCrop(userId, {
                  ...locator,
                  x: 0.3,
                  y: 0.6,
                  zoom: 1.4,
                })
              : saveLivingBannerCopy(userId, {
                  ...locator,
                  quote: "",
                  attribution: "",
                  quoteSource: "",
                  rightLine: "A stale edit must not change an archive",
                });
        await expect(save).rejects.toThrow(/closed/i);
        const after = await prisma.livingSeasonPack.findUniqueOrThrow({
          where: { id: packId },
        });
        expect(after.characterBanner).toEqual(before.characterBanner);
      } finally {
        lookup.mockRestore();
      }
    },
  );
  it("rejects a crop edit after the character version changes during its initial read", async () => {
    const oldIdentity = await getCotsIdentity(userId, seasonId);
    const before = await prisma.livingSeasonPack.findUniqueOrThrow({
      where: { id: packId },
    });
    await saveCotsIdentity(userId, {
      ...locator,
      displayName: profile.characterName,
      sourceCategory: "anime",
      sourceWork: profile.sourceWork,
      adaptation: "Movie",
      expectedIdentityRevision: oldIdentity!.row.revision,
      association: "SAME",
    });
    const lookup = vi
      .spyOn(prisma.seasonCotsIdentity, "findFirst")
      .mockResolvedValueOnce(oldIdentity!.row);
    try {
      await expect(
        saveLivingBannerCrop(userId, { ...locator, x: 0.3, y: 0.6, zoom: 1.4 }),
      ).rejects.toThrow(/character changed/i);
      const after = await prisma.livingSeasonPack.findUniqueOrThrow({
        where: { id: packId },
      });
      expect(after.characterBanner).toEqual(before.characterBanner);
    } finally {
      lookup.mockRestore();
    }
  });
  it("does not expose another character's retained reference as current imagery", async () => {
    const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
      where: { id: packId },
      include: { profiles: { orderBy: { version: "desc" }, take: 1 } },
    });
    const referenceData = {
      userId,
      packId,
      briefRevision: pack.briefRevision,
      profileVersion: pack.profiles[0].version,
      width: 1200,
      height: 600,
      prompt: "Saved reference fixture.",
      approvedAt: new Date(),
    };
    await prisma.livingSeasonReference.create({
      data: {
        ...referenceData,
        identityId: "previous-character",
        revision: 1,
        storageKey: `fixture/${randomUUID()}.webp`,
      },
    });
    const withoutCurrent = await getLivingSeasonPack(
      userId,
      locator.year,
      locator.quarter,
    );
    expect(withoutCurrent?.referenceId).toBeNull();
    expect(withoutCurrent?.referenceHref).toBeNull();
    expect(withoutCurrent?.referenceApproved).toBe(false);
    const current = await prisma.livingSeasonReference.create({
      data: {
        ...referenceData,
        identityId,
        revision: 2,
        storageKey: `fixture/${randomUUID()}.webp`,
      },
    });
    // A later retained revision of another character must not hide this one's reference.
    await prisma.livingSeasonReference.create({
      data: {
        ...referenceData,
        identityId: "previous-character",
        revision: 3,
        storageKey: `fixture/${randomUUID()}.webp`,
      },
    });
    const withCurrent = await getLivingSeasonPack(
      userId,
      locator.year,
      locator.quarter,
    );
    expect(withCurrent?.referenceId).toBe(current.id);
    expect(withCurrent?.referenceHref).toBe(
      `/api/direction/seasons/living/reference/${current.id}`,
    );
    expect(withCurrent?.referenceApproved).toBe(true);
  });
  it("blocks description-only generation and attaches confirmed originals to every package", async () => {
    await expect(
      resolveSeasonImagePackage(userId, 2026, 4, {
        variant: "reference-sheet",
      }),
    ).rejects.toThrow("authentic image");
    const original = await source();
    await reviewLivingSourceImage(userId, {
      ...locator,
      imageId: original.id,
      characterLikenessConfirmed: true,
    });
    const first = await resolveSeasonImagePackage(userId, 2026, 4, {
      variant: "reference-sheet",
    });
    expect(first.references.map((r) => r.kind)).toEqual([
      "canonical-character",
    ]);
    const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
      where: { id: packId },
    });
    await prisma.livingSeasonReference.create({
      data: {
        userId,
        packId,
        identityId,
        briefRevision: pack.briefRevision,
        profileVersion: 1,
        revision: 1,
        storageKey: "fixture/sheet.webp",
        width: 1200,
        height: 600,
        prompt: first.prompt,
        approvedAt: new Date(),
      },
    });
    for (const variant of [
      "banner-desktop",
      "portrait",
      "scene-neutral-desktop",
    ] as const) {
      const value = await resolveSeasonImagePackage(userId, 2026, 4, {
        variant,
        ...(variant.startsWith("scene")
          ? {
              slot: {
                chapter: 1,
                state: "NEUTRAL" as const,
                format: "DESKTOP" as const,
              },
            }
          : {}),
      });
      expect(value.references[0].id).toBe(original.id);
      expect(value.references[1].kind).toBe("reference-sheet");
    }
  });
  it("rejects another adaptation and prevents three originals from exceeding the reference allowance", async () => {
    const wrong = await source("Manga");
    await expect(
      reviewLivingSourceImage(userId, {
        ...locator,
        imageId: wrong.id,
        characterLikenessConfirmed: true,
      }),
    ).rejects.toThrow("adaptation");
    for (let i = 0; i < 2; i++) {
      const image = await source();
      await reviewLivingSourceImage(userId, {
        ...locator,
        imageId: image.id,
        characterLikenessConfirmed: true,
      });
    }
    const third = await source();
    await expect(
      reviewLivingSourceImage(userId, {
        ...locator,
        imageId: third.id,
        characterLikenessConfirmed: true,
      }),
    ).rejects.toThrow("two primary");
  });
  it("keeps the previous active scenes while replacing the world, intent, and identity", async () => {
    const pack = await prisma.livingSeasonPack.findUniqueOrThrow({
      where: { id: packId },
    });
    await prisma.livingSeasonArtwork.createMany({
      data: livingArtworkSlots.map((slot) => ({
        userId,
        packId,
        identityId,
        briefRevision: pack.briefRevision,
        ...slot,
        revision: 1,
        storageKey: `fixture/${slot.chapter}-${slot.state}-${slot.format}.webp`,
        prompt: "Fixture",
        width: slot.format === "DESKTOP" ? 1600 : 600,
        height: slot.format === "DESKTOP" ? 900 : 1200,
        approvedAt: new Date(),
      })),
    });
    await prisma.livingSeasonPack.update({
      where: { id: packId },
      data: { activeAt: new Date() },
    });
    const facts = {
      chapter: 1,
      state: "NEUTRAL" as const,
      dayNumber: 1,
      totalDays: 92,
      expectedPercent: null,
      actualPercent: null,
      gapPoints: null,
      measuredGoals: 0,
      totalGoals: 0,
      goals: [],
    };
    const before = await getLivingSeasonScene(userId, seasonId, facts);
    await saveLivingVisualIntent(userId, {
      ...locator,
      visualIntent: {
        ...intent,
        atmosphere: "A different reviewed afternoon atmosphere",
      },
    });
    await approveLivingVisualIntent(userId, locator);
    await saveLivingSeasonSetup(userId, {
      ...locator,
      setting: "A new reviewed city",
      visualBrief: "A deliberate new visual setting",
    });
    await saveCotsIdentity(userId, {
      ...locator,
      displayName: "Replacement Character",
      sourceCategory: "anime",
      sourceWork: "Another Work",
      adaptation: "TV anime",
      association: "NEW",
      expectedIdentityRevision: 1,
    });
    const after = await getLivingSeasonScene(userId, seasonId, facts);
    expect(after?.desktopHref).toBe(before?.desktopHref);
    expect(after?.characterName).toBe("Fixture Character");
    expect(
      (
        await prisma.livingSeasonPack.findUniqueOrThrow({
          where: { id: packId },
        })
      ).activeAt,
    ).toBeNull();
  });
});
