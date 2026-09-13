import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { requireReviewTestDatabase } from "./review-fixture.service";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";

/** Authored geometric fixture, with explicit test provenance. No researched/inferred persona. */
export async function addReviewArtworkFixture(
  userId: string,
  seasonId: string,
  contentId: string,
) {
  requireReviewTestDatabase();
  if (
    !(await prisma.user.findFirst({
      where: {
        id: userId,
        email: { startsWith: "phase7-", endsWith: "@example.test" },
      },
    }))
  )
    throw Error("Not a disposable fixture user");
  const identity = await prisma.seasonCotsIdentity.create({
    data: {
      userId,
      seasonId,
      displayName: "The traveler · test identity",
      subjectKind: "FICTIONAL",
      contexts: {
        create: {
          revision: 1,
          category: "book",
          sourceWork: "Locally authored verification fixture",
          adaptation: "Geometric art only; no character profile",
        },
      },
    },
  });
  await prisma.userSeason.update({
    where: { id: seasonId, userId },
    data: {
      character: {
        ...emptySeasonDraft().character,
        name: identity.displayName,
        sourceCategory: "book",
        sourceWork: "Locally authored verification fixture",
        adaptation: "Geometric art only; no character profile",
        motivation: "A user-entered constraint used to test the contract.",
        avoid: "No invented character psychology.",
        standards: [
          {
            key: "test-standard",
            trait: "Test standard",
            behavior: "Keep one useful promise each week.",
          },
        ],
      },
    },
  });
  const provenance = {
    version: 2,
    origin: "MANUAL",
    sourceUrl: null,
    sourceTitle: "Locally authored geometric test art",
    credit: "Disposable Phase 7 verification",
    provider: null,
    externalId: null,
    selectedAt: new Date().toISOString(),
    attributionVerified: false,
    evidence: "UNRESOLVED",
    sourceDetail:
      "Synthetic test artwork. Does not depict or characterize a canonical person or character.",
    language: "en",
  };
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#dad0b4"/><circle cx="880" cy="370" r="155" fill="#ad6946"/><path d="M0 1000 390 460 850 1100 1200 680V1600H0Z" fill="#516565"/><path d="M0 1270 550 770 1200 1480V1600H0Z" fill="#233e3c"/><path d="M440 1600 695 1090 742 1105 588 1600Z" fill="#c7bd9d"/><circle cx="690" cy="1090" r="25" fill="#172a27"/><path d="m677 1110-19 114 78-10-22-113Z" fill="#172a27"/></svg>';
  const bytes = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer(),
    hash = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `media/seasons/${userId}/${randomUUID()}.webp`;
  await getMediaStorage().put(storageKey, bytes);
  const media = await prisma.seasonMedia.create({
    data: {
      userId,
      seasonId,
      storageKey,
      mimeType: "image/webp",
      byteSize: bytes.length,
      contentHash: hash,
      width: 1200,
      height: 1600,
      alt: "Authored test scenery: a small geometric traveler below layered mountains",
      poster: true,
      provenance,
    },
  });
  await prisma.seasonMediaUse.create({
    data: {
      userId,
      seasonId,
      mediaId: media.id,
      identityId: identity.id,
      poster: true,
    },
  });
  await prisma.seasonQuote.create({
    data: {
      userId,
      seasonId,
      identityId: identity.id,
      text: "This is a test of how an unverified quotation is presented.",
      attribution: "Disposable test text — not a canonical quote",
      kind: "UNKNOWN",
      featured: true,
      provenance: {
        ...provenance,
        sourceTitle: "Manually authored attribution test",
      },
    },
  });
  const variant = await prisma.contentVariant.findFirstOrThrow({
    where: { userId, contentId },
  });
  const thumbnail = await sharp(bytes)
      .resize(960, 540, { fit: "cover" })
      .webp()
      .toBuffer(),
    key = `media/content/${userId}/${randomUUID()}.webp`;
  await getMediaStorage().put(key, thumbnail);
  await prisma.contentMedia.create({
    data: {
      userId,
      variantId: variant.id,
      storageKey: key,
      width: 960,
      height: 540,
      bytes: thumbnail.length,
      sha256: createHash("sha256").update(thumbnail).digest("hex"),
    },
  });
  return { identityId: identity.id, mediaId: media.id };
}
