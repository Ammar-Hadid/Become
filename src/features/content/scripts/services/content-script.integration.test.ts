import "dotenv/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { executeContentCommand } from "@/features/content/services/content-mutation.service";
import { getContentWorkspace } from "@/features/content/queries/content.query";
import { getContentScript } from "@/features/content/scripts/queries/content-script.query";
import {
  readScriptImage,
  saveScriptImage,
} from "@/features/content/scripts/images/services/content-script-image.service";
import {
  scriptDocumentFromText,
  scriptPlainText,
} from "@/features/content/scripts/utils/content-script-document.util";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import type { ScriptDocument } from "@/features/content/scripts/types/content-script.types";

const suite =
  process.env.RUN_CONTENT_INTEGRATION === "1" ? describe : describe.skip;
suite("Content scripts in PostgreSQL", () => {
  const userId = `script-qa-${randomUUID()}`,
    otherId = `script-qa-${randomUUID()}`;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/become_phase6_")
    )
      throw new Error("Only an isolated Phase 6 database is allowed");
    for (const id of [userId, otherId]) {
      await prisma.user.create({
        data: { id, email: `${id}@example.com`, name: "Disposable script QA" },
      });
      await ensureDefaultDomains(id);
    }
  });
  afterAll(async () => {
    const images = await prisma.contentScriptImage.findMany({
      where: { userId: { in: [userId, otherId] } },
      select: { storageKey: true },
    });
    await prisma.content.deleteMany({
      where: { userId: { in: [userId, otherId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    for (const image of images)
      await getMediaStorage().remove(image.storageKey);
  });
  async function create() {
    const created = await executeContentCommand(userId, {
      type: "CREATE_CONTENT",
      operationKey: randomUUID(),
      draft: {
        title: "A script to make",
        purpose: "",
        audience: "",
        notes: "",
      },
      format: "SHORT_VERTICAL",
    });
    const variant = await prisma.contentVariant.findFirstOrThrow({
      where: { contentId: created.contentId },
    });
    return { contentId: created.contentId!, variantId: variant.id };
  }
  const save = (
    ids: { contentId: string; variantId: string },
    text: string,
    expectedScriptVersion = 1,
    operationKey = randomUUID(),
  ) =>
    executeContentCommand(userId, {
      type: "SAVE_SCRIPT",
      ...ids,
      document: scriptDocumentFromText(text),
      expectedScriptVersion,
      operationKey,
    });

  it("preserves legacy text and exposes only a summary in the workspace", async () => {
    const ids = await create();
    const legacy = "<p>literal text</p>\n\nA second beat\n";
    await prisma.contentVariant.update({
      where: { id: ids.variantId },
      data: { script: legacy },
    });
    const before = await getContentScript(userId, ids.contentId, ids.variantId);
    expect(scriptPlainText(before!.document)).toBe(legacy);
    expect(
      (
        await prisma.contentVariant.findUniqueOrThrow({
          where: { id: ids.variantId },
        })
      ).scriptDocument,
    ).toBeNull();
    const workspace = await getContentWorkspace(userId, ids.contentId);
    expect(workspace!.variants[0].scriptSummary.hasContent).toBe(true);
    expect(workspace!.variants[0]).not.toHaveProperty("scriptDocument");
    expect(workspace!.variants[0]).not.toHaveProperty("script");
    await save(ids, legacy + "A closing line");
    expect(
      (await getContentScript(userId, ids.contentId, ids.variantId))!
        .scriptVersion,
    ).toBe(2);
  });
  it("saves metadata and script concurrently without overwriting either", async () => {
    const ids = await create();
    await Promise.all([
      save(ids, "Keep this script"),
      executeContentCommand(userId, {
        type: "SAVE_WRITING",
        ...ids,
        expectedWritingVersion: 1,
        operationKey: randomUUID(),
        draft: {
          hook: "A new hook",
          outline: "Two beats",
          productionNotes: "A quiet room",
        },
      }),
    ]);
    const row = await prisma.contentVariant.findUniqueOrThrow({
      where: { id: ids.variantId },
    });
    expect(row).toMatchObject({
      hook: "A new hook",
      script: "Keep this script",
      scriptVersion: 2,
      writingVersion: 2,
      version: 1,
    });
    await expect(
      executeContentCommand(userId, {
        type: "SAVE_WRITING",
        ...ids,
        expectedWritingVersion: 2,
        operationKey: randomUUID(),
        draft: {
          hook: "Old tab",
          outline: "",
          script: "overwrite",
          productionNotes: "",
        },
      }),
    ).rejects.toThrow();
    expect(
      (await getContentScript(userId, ids.contentId, ids.variantId))!.document,
    ).toEqual(scriptDocumentFromText("Keep this script"));
  });
  it("rejects competing tabs and replays the exact acknowledged snapshot", async () => {
    const ids = await create();
    const operationKey = randomUUID();
    const first = await save(ids, "First confirmed draft", 1, operationKey);
    const competing = await Promise.allSettled([
      save(ids, "Second A", 2),
      save(ids, "Second B", 2),
    ]);
    expect(
      competing.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      competing.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await save(ids, "First confirmed draft", 1, operationKey)).toEqual(
      first,
    );
    expect(
      (await getContentScript(userId, ids.contentId, ids.variantId))!
        .scriptVersion,
    ).toBe(3);
    await expect(
      save(ids, "Different submission", 1, operationKey),
    ).rejects.toThrow(/different values/);
  });
  it("enforces content, variant, owner, and archival boundaries", async () => {
    const first = await create(),
      second = await create();
    expect(
      await getContentScript(otherId, first.contentId, first.variantId),
    ).toBeNull();
    expect(
      await getContentScript(userId, first.contentId, second.variantId),
    ).toBeNull();
    await expect(
      save({ ...first, variantId: second.variantId }, "Wrong parent"),
    ).rejects.toThrow(/belong/);
    await prisma.contentVariant.update({
      where: { id: first.variantId },
      data: { archivedAt: new Date() },
    });
    expect(
      (await getContentScript(userId, first.contentId, first.variantId))!
        .readOnly,
    ).toBe(true);
    await expect(save(first, "Archived write")).rejects.toThrow(/Restore/);
  });
  it("keeps owned images separate from thumbnails and rejects image reuse across variants", async () => {
    const ids = await create(),
      other = await create();
    const bytes = await sharp({
      create: { width: 80, height: 50, channels: 3, background: "#e8a83e" },
    })
      .png()
      .toBuffer();
    const command = { ...ids, operationKey: randomUUID() };
    const image = await saveScriptImage(userId, command, bytes);
    expect(await saveScriptImage(userId, command, bytes)).toEqual(image);
    expect(await readScriptImage(otherId, image.id)).toBeNull();
    expect(
      (await readScriptImage(userId, image.id))?.bytes.length,
    ).toBeGreaterThan(0);
    const document: ScriptDocument = {
      schemaVersion: 1,
      content: {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { mediaId: image.id, src: image.url, alt: "Storyboard" },
          },
        ],
      },
    };
    await executeContentCommand(userId, {
      type: "SAVE_SCRIPT",
      ...ids,
      expectedScriptVersion: 1,
      operationKey: randomUUID(),
      document,
    });
    const workspace = await getContentWorkspace(userId, ids.contentId);
    expect(workspace!.variants[0].thumbnail).toBeNull();
    expect(workspace!.variants[0].scriptSummary.hasContent).toBe(true);
    await expect(
      executeContentCommand(userId, {
        type: "SAVE_SCRIPT",
        ...other,
        expectedScriptVersion: 1,
        operationKey: randomUUID(),
        document,
      }),
    ).rejects.toThrow(/does not belong/);
    await save(ids, "", 2);
    expect(
      (await getContentWorkspace(userId, ids.contentId))!.variants[0]
        .scriptSummary.hasContent,
    ).toBe(false);
    // Removed image assets remain available for an open editor's undo history.
    expect(await readScriptImage(userId, image.id)).not.toBeNull();
  });
});
