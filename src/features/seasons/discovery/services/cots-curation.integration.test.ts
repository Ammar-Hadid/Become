import "dotenv/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { saveSeason } from "@/features/seasons/services/season.service";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
import { saveCotsIdentity } from "./cots-identity.service";
import {
  selectCotsCandidate,
  confirmCotsSelection,
  cotsPreflight,
} from "./cots-curation.service";
import { importCotsSelection } from "./cots-import.service";
import { getCotsCollection } from "@/features/seasons/discovery/queries/cots-collection.query";
import { changeCotsMediaUse } from "./cots-library.service";
import { uploadSeasonMedia } from "@/features/seasons/media/services/season-media.service";
import { getSeasonView } from "@/features/seasons/queries/season.query";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
import { fetchPublicImage } from "./cots-public-image.service";
import { maintainCotsDiscovery } from "./cots-maintenance.service";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
vi.mock("./cots-public-image.service", () => ({ fetchPublicImage: vi.fn() }));
const enabled = process.env.RUN_COTS_INTEGRATION === "1";
describe.skipIf(!enabled)(
  "COTS ownership, independent revisions and durable imports",
  () => {
    let userId: string, email: string, bytes: Buffer;
    const scope = { year: 2026, quarter: 3 };
    beforeEach(async () => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error("Local PostgreSQL required");
      email = `phase55-${randomUUID()}@example.test`;
      userId = (
        await prisma.user.create({
          data: { email, name: "Disposable COTS test" },
        })
      ).id;
      await saveSeason(userId, {
        ...scope,
        expectedVersion: 0,
        operationKey: randomUUID(),
        draft: emptySeasonDraft(),
      });
      bytes = await sharp({
        create: { width: 60, height: 80, channels: 4, background: "#123456" },
      })
        .png()
        .toBuffer();
      vi.mocked(fetchPublicImage).mockResolvedValue(bytes);
      await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Test character",
        sourceCategory: "comic",
        sourceWork: "Test work",
        expectedIdentityRevision: 0,
      });
    });
    afterEach(async () => {
      if (userId) {
        const jobs = await prisma.seasonCotsSelection.findMany({
          where: { userId },
          select: { storageKey: true },
        });
        await deleteDisposableBrowserUser(userId, email);
        for (const job of jobs)
          if (job.storageKey) await getMediaStorage().remove(job.storageKey);
      }
      vi.clearAllMocks();
    });
    async function select(image = true) {
      const collection = await getCotsCollection(
          userId,
          scope.year,
          scope.quarter,
        ),
        identity = collection.identity!;
      const season = await prisma.userSeason.findUniqueOrThrow({
        where: { userId_year_quarter: { userId, ...scope } },
      });
      const snapshot: ProviderCandidate & {
        sourceCategory: string;
        adaptation: string;
      } = {
        provider: "fixture",
        externalId: randomUUID(),
        form: image ? "IMAGE" : "QUOTATION",
        title: "Test character",
        width: 60,
        height: 80,
        text: image ? null : "An exact synthetic test sentence.",
        speaker: image ? null : "Test character",
        sourceUrl: "https://example.com/source",
        sourceWork: "Test work",
        sourceDetail: "Synthetic test source",
        credit: "Fixture",
        license: null,
        evidence: "PROVIDER",
        language: "en",
        importable: true,
        unavailableReason: null,
        originalUrl: image ? "https://example.com/image.png" : undefined,
        sourceCategory: identity.sourceCategory!,
        adaptation: identity.adaptation,
      };
      const candidate = await prisma.seasonCotsCandidate.create({
        data: {
          userId,
          seasonId: season.id,
          identityId: identity.id,
          contextId: identity.discoveryContextId!,
          provider: "fixture",
          sourceKey: randomUUID(),
          kind: image ? "IMAGE" : "TEXT",
          snapshot: JSON.parse(JSON.stringify(snapshot)),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return selectCotsCandidate(userId, {
        ...scope,
        candidateRef: candidate.id,
        selected: true,
        expectedSelectionRevision: collection.selectionRevision,
      });
    }
    it("changes routing context without losing selections or changing the broad draft version", async () => {
      const selected = await select();
      const changed = await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Test character",
        sourceCategory: "movie",
        sourceWork: "Film work",
        expectedIdentityRevision: selected.identity!.identityRevision,
      });
      expect(changed.identity!.id).toBe(selected.identity!.id);
      expect(changed.identity!.discoveryRevision).toBe(2);
      expect(changed.selections[0].sourceCategory).toBe("comic");
      expect(
        (await getSeasonView(userId, scope.year, scope.quarter)).version,
      ).toBe(1);
      expect(changed.selections[0].id).toBe(selected.selections[0].id);
    });
    it("requires intent for subject switches and preserves the previous collection", async () => {
      const selected = await select();
      await expect(
        saveCotsIdentity(userId, {
          ...scope,
          displayName: "Another subject",
          sourceCategory: "game",
          expectedIdentityRevision: 1,
        }),
      ).rejects.toThrow("Confirm whether");
      const next = await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Another subject",
        sourceCategory: "game",
        expectedIdentityRevision: 1,
        association: "NEW",
      });
      expect(next.identity!.id).not.toBe(selected.identity!.id);
      expect(next.selections).toHaveLength(0);
      expect(
        await prisma.seasonCotsSelection.count({
          where: { userId, identityId: selected.identity!.id },
        }),
      ).toBe(1);
    });
    it("keeps import confirmation independent and never late-features after begin with current poster", async () => {
      const selected = await select(),
        id = selected.selections[0].id;
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
        desiredPosterSelectionId: id,
      });
      await cotsPreflight(userId, { ...scope, beginWithCurrentPoster: true });
      const ready = await importCotsSelection(userId, {
        ...scope,
        selectionId: id,
      });
      expect(ready.selections[0].status).toBe("READY");
      const view = await getSeasonView(userId, scope.year, scope.quarter);
      expect(view.media).toHaveLength(1);
      expect(view.media[0].poster).toBe(false);
      expect(view.version).toBe(1);
      await importCotsSelection(userId, { ...scope, selectionId: id });
      expect(await prisma.seasonMedia.count({ where: { userId } })).toBe(1);
      expect(fetchPublicImage).toHaveBeenCalledTimes(1);
    });
    it("honors the selected old context when the category changes before the download finishes", async () => {
      const selected = await select(),
        id = selected.selections[0].id;
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
      });
      await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Test character",
        sourceCategory: "movie",
        expectedIdentityRevision: 1,
      });
      const ready = await importCotsSelection(userId, {
        ...scope,
        selectionId: id,
      });
      expect(ready.selections[0].status).toBe("READY");
      expect(ready.selections[0].sourceCategory).toBe("comic");
    });
    it("preserves a prepared file and recovers an expired lease without another network fetch", async () => {
      const selected = await select(),
        id = selected.selections[0].id;
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
      });
      const job = await prisma.seasonCotsSelection.findUniqueOrThrow({
        where: { id },
      });
      const key = `media/seasons/${job.seasonId}/${randomUUID()}.webp`;
      const prepared = await sharp(bytes).webp().toBuffer();
      await getMediaStorage().put(key, prepared);
      await prisma.seasonCotsSelection.update({
        where: { id },
        data: {
          status: "IMPORTING",
          storageKey: key,
          leaseToken: "expired",
          leaseUntil: new Date(0),
        },
      });
      const ready = await importCotsSelection(userId, {
        ...scope,
        selectionId: id,
      });
      expect(ready.selections[0].status).toBe("READY");
      expect(fetchPublicImage).not.toHaveBeenCalled();
      const media = await prisma.seasonMedia.findFirstOrThrow({
        where: { userId },
      });
      expect(await getMediaStorage().read(media.storageKey)).toEqual(prepared);
    });
    it("supports offline manual media without incrementing opening autosave version", async () => {
      const collection = await getCotsCollection(
        userId,
        scope.year,
        scope.quarter,
      );
      await uploadSeasonMedia(
        userId,
        {
          ...scope,
          expectedVersion: 0,
          operationKey: randomUUID(),
          draft: {
            alt: "Test raster",
            decorative: false,
            focalX: 0.5,
            focalY: 0.5,
            poster: true,
            provenance: {
              sourceUrl: "",
              sourceTitle: "Personal illustration",
              credit: "Fixture",
              attributionVerified: false,
            },
          },
        },
        bytes,
        collection.selectionRevision,
      );
      const view = await getSeasonView(userId, scope.year, scope.quarter);
      expect(view.version).toBe(1);
      expect(view.media).toHaveLength(1);
    });
    it("reuses one stored file across two explicitly confirmed identities", async () => {
      const selected = await select(),
        id = selected.selections[0].id;
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
      });
      const ready = await importCotsSelection(userId, {
        ...scope,
        selectionId: id,
      });
      const next = await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Another subject",
        sourceCategory: "game",
        expectedIdentityRevision: 1,
        association: "NEW",
      });
      await changeCotsMediaUse(userId, {
        ...scope,
        action: "REUSE_IMAGE",
        expectedSelectionRevision: next.selectionRevision,
        mediaId: ready.selections[0].mediaId,
      });
      expect(await prisma.seasonMedia.count({ where: { userId } })).toBe(1);
      expect(await prisma.seasonMediaUse.count({ where: { userId } })).toBe(2);
    });
    it("treats repeated text confirmation as one committed batch", async () => {
      const selected = await select(false);
      const input = {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
        desiredQuoteSelectionId: selected.selections[0].id,
      };
      await confirmCotsSelection(userId, input);
      await confirmCotsSelection(userId, input);
      expect(await prisma.seasonQuote.count({ where: { userId } })).toBe(1);
      expect(
        await prisma.seasonQuote.findFirstOrThrow({ where: { userId } }),
      ).toMatchObject({ featured: true });
    });
    it("serializes duplicate image workers and leaves one ready file", async () => {
      const selected = await select(),
        id = selected.selections[0].id;
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
      });
      await Promise.all([
        importCotsSelection(userId, { ...scope, selectionId: id }),
        importCotsSelection(userId, { ...scope, selectionId: id }),
      ]);
      expect(fetchPublicImage).toHaveBeenCalledTimes(1);
      expect(await prisma.seasonMedia.count({ where: { userId } })).toBe(1);
    });
    it("preserves selected sources while reclaiming expired previews and abandoned prepared files", async () => {
      const selected = await select(),
        job = selected.selections[0];
      const retained = await prisma.seasonCotsCandidate.update({
        where: { id: job.candidateRef! },
        data: { expiresAt: new Date(0) },
      });
      const expired = await prisma.seasonCotsCandidate.create({
        data: {
          userId,
          seasonId: retained.seasonId,
          identityId: retained.identityId,
          contextId: retained.contextId,
          provider: "fixture",
          sourceKey: randomUUID(),
          kind: "IMAGE",
          snapshot: retained.snapshot as object,
          expiresAt: new Date(0),
        },
      });
      const key = `media/seasons/${retained.seasonId}/${randomUUID()}.webp`;
      await getMediaStorage().put(key, bytes);
      await prisma.seasonCotsSelection.update({
        where: { id: job.id },
        data: { status: "FAILED", storageKey: key, updatedAt: new Date(0) },
      });
      await maintainCotsDiscovery(userId);
      expect(
        await prisma.seasonCotsCandidate.findUnique({
          where: { id: expired.id },
        }),
      ).toBeNull();
      expect(
        await prisma.seasonCotsCandidate.findUnique({
          where: { id: retained.id },
        }),
      ).not.toBeNull();
      expect(
        await prisma.seasonCotsSelection.findUniqueOrThrow({
          where: { id: job.id },
        }),
      ).toMatchObject({ status: "FAILED", storageKey: null });
      await expect(getMediaStorage().read(key)).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
    it("versions category edits and preserves the explicitly selected entity reference", async () => {
      const next = await saveCotsIdentity(userId, {
        ...scope,
        displayName: "Test character",
        sourceCategory: "movie",
        externalId: "Q123",
        expectedIdentityRevision: 1,
      });
      expect(next.identity).toMatchObject({
        identityRevision: 2,
        discoveryRevision: 2,
        sourceEntityId: "Q123",
      });
      await expect(
        saveCotsIdentity(userId, {
          ...scope,
          displayName: "Test character",
          sourceCategory: "book",
          expectedIdentityRevision: 1,
        }),
      ).rejects.toThrow();
    });
    it("rejects foreign candidate references and does not independently verify saved provider text", async () => {
      await expect(
        selectCotsCandidate(userId, {
          ...scope,
          candidateRef: "not-owned",
          selected: true,
          expectedSelectionRevision: 0,
        }),
      ).rejects.toThrow("expired");
      const selected = await select(false);
      await confirmCotsSelection(userId, {
        ...scope,
        expectedSelectionRevision: selected.selectionRevision,
      });
      const quote = await prisma.seasonQuote.findFirstOrThrow({
        where: { userId },
      });
      expect(quote.provenance).toMatchObject({
        attributionVerified: false,
        evidence: "PROVIDER",
        form: "QUOTATION",
      });
    });
  },
);
