import "dotenv/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { filesystemMediaStorage } from "@/lib/storage/adapters/filesystem-media.adapter";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
import { saveSeason } from "@/features/seasons/services/season.service";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
import {
  uploadSeasonMedia,
  saveSeasonMedia,
  saveSeasonQuote,
} from "./season-media.service";
const enabled = process.env.RUN_DIRECTION_INTEGRATION === "1";
describe.skipIf(!enabled)("private seasonal media transactions", () => {
  let userId: string, email: string;
  const identity = { year: 2026, quarter: 3 };
  const metadata = {
    alt: "A calm blue field",
    decorative: false,
    focalX: 0.5,
    focalY: 0.5,
    poster: true,
    provenance: {
      sourceUrl: "",
      sourceTitle: "Test raster",
      credit: "Local test fixture",
      attributionVerified: false,
    },
  };
  beforeEach(async () => {
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error("Local PostgreSQL required");
    email = `phase5-media-${randomUUID()}@example.test`;
    userId = (
      await prisma.user.create({
        data: { email, name: "Disposable media test" },
      })
    ).id;
    await saveSeason(userId, {
      ...identity,
      expectedVersion: 0,
      operationKey: randomUUID(),
      draft: emptySeasonDraft(),
    });
  });
  afterEach(async () => {
    if (userId) await deleteDisposableBrowserUser(userId, email);
  });
  const raster = () =>
    sharp({
      create: { width: 40, height: 60, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
  it("stores only logical metadata and makes duplicate uploads idempotent", async () => {
    const input = {
        ...identity,
        expectedVersion: 1,
        operationKey: randomUUID(),
        draft: metadata,
      },
      bytes = await raster();
    const saved = await uploadSeasonMedia(userId, input, bytes);
    expect(await uploadSeasonMedia(userId, input, bytes)).toEqual(saved);
    const media = await prisma.seasonMedia.findMany({ where: { userId } });
    expect(media).toHaveLength(1);
    expect(media[0].storageKey).toMatch(/^media\/seasons\//);
    expect(media[0].mimeType).toBe("image/webp");
    expect(
      (await filesystemMediaStorage().read(media[0].storageKey)).length,
    ).toBe(media[0].byteSize);
    expect(media[0].provenance).toMatchObject({
      origin: "MANUAL",
      provider: null,
      externalId: null,
    });
    await saveSeasonMedia(userId, {
      ...identity,
      expectedVersion: saved.version,
      operationKey: randomUUID(),
      mediaId: media[0].id,
      retire: true,
    });
    expect(
      await prisma.seasonMedia.count({ where: { userId, retiredAt: null } }),
    ).toBe(0);
    expect(
      (await filesystemMediaStorage().read(media[0].storageKey)).length,
    ).toBeGreaterThan(0);
  });
  it("caps active images and prevents stale metadata replacing the poster", async () => {
    let version = 1;
    const bytes = await raster();
    for (let i = 0; i < 3; i++)
      version = (
        await uploadSeasonMedia(
          userId,
          {
            ...identity,
            expectedVersion: version,
            operationKey: randomUUID(),
            draft: metadata,
          },
          bytes,
        )
      ).version;
    await expect(
      uploadSeasonMedia(
        userId,
        {
          ...identity,
          expectedVersion: version,
          operationKey: randomUUID(),
          draft: metadata,
        },
        bytes,
      ),
    ).rejects.toThrow("three");
    expect(
      await prisma.seasonMedia.count({
        where: { userId, poster: true, retiredAt: null },
      }),
    ).toBe(1);
    const media = await prisma.seasonMedia.findFirstOrThrow({
      where: { userId },
    });
    await expect(
      saveSeasonMedia(userId, {
        ...identity,
        expectedVersion: 1,
        operationKey: randomUUID(),
        mediaId: media.id,
        draft: { ...metadata, alt: "Stale" },
      }),
    ).rejects.toThrow("changed");
  });
  it("does not present unverified words as an exact quote", async () => {
    const input = {
      ...identity,
      expectedVersion: 1,
      operationKey: randomUUID(),
      draft: {
        text: "An invented test sentence.",
        attribution: "Fictional figure",
        kind: "EXACT",
        featured: true,
        provenance: metadata.provenance,
      },
    };
    await expect(saveSeasonQuote(userId, input)).rejects.toThrow(
      "Exact quotes",
    );
    await saveSeasonQuote(userId, {
      ...input,
      draft: { ...input.draft, kind: "UNKNOWN" },
    });
    expect(await prisma.seasonQuote.count({ where: { userId } })).toBe(1);
  });
});
