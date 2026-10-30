import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import {
  livingCharacterProfileSchema,
  type LivingArtworkSlot,
} from "@/features/seasons/living/schemas/living-season.schema";
import { currentImageReferences } from "../utils/image-references.util";
import { visualIntentSchema } from "../schemas/visual-intent.schema";
import { visualBriefFingerprint } from "../utils/visual-intent.util";
import {
  assembleImagePromptPackage,
  sceneTemplateKey,
  type ImagePromptPackage,
  type ImagePromptVariant,
} from "../utils/image-prompt-package.util";
import { getPublishedImageTemplates } from "./image-direction-template.service";
import { z } from "zod";
import {
  DirectionError as PromptError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { fingerprint as promptReceiptFingerprint } from "@/features/direction/services/direction-mutation.service";
import {
  loadImagePromptContext,
  findWrittenPromptBatch,
} from "./image-prompt-writing.service";
import { writtenPromptBatchSchema } from "../schemas/image-prompt-writing.schema";

export async function resolveSeasonImagePackage(
  userId: string,
  year: number,
  quarter: number,
  request: {
    variant: ImagePromptVariant;
    slot?: LivingArtworkSlot;
    draftTemplate?: {
      key: string;
      version: number;
      text: string;
      authoring?: unknown;
    };
    ignoreReferenceOverride?: boolean;
    allowTemplateOnly?: boolean;
    batchId?: string;
    resolution?: "1K" | "2K";
    receipt?: string;
  },
): Promise<ImagePromptPackage> {
  const season = await prisma.userSeason.findUnique({
    where: { userId_year_quarter: { userId, year, quarter } },
  });
  if (!season)
    throw new DirectionError(
      "Choose a saved Season to assemble an image prompt.",
    );
  const identity = await getCotsIdentity(userId, season.id);
  const pack = await prisma.livingSeasonPack.findUnique({
    where: { seasonId: season.id },
    include: {
      profiles: { orderBy: { version: "desc" }, take: 1 },
      visualIntents: { orderBy: { version: "desc" }, take: 1 },
      sourceImages: {
        where: { approvedAt: { not: null }, retiredAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      references: { orderBy: { revision: "desc" }, take: 1 },
      artwork: {
        where: { approvedAt: { not: null } },
        orderBy: [{ chapter: "desc" }, { revision: "desc" }],
      },
    },
  });
  if (!identity || !pack || pack.identityId !== identity.row.id)
    throw new DirectionError(
      "Choose a C.O.T.S. and save the Season setting first.",
    );
  const profileRow = pack.profiles[0];
  if (!profileRow?.approvedAt)
    throw new DirectionError("Approve the current character profile first.");
  const profile = livingCharacterProfileSchema.parse(profileRow.content);
  const intentRow = pack.visualIntents[0];
  const fingerprint = visualBriefFingerprint(
    identity.row.id,
    profileRow.version,
    pack.setting,
    pack.visualBrief,
  );
  if (
    !intentRow?.approvedAt ||
    intentRow.identityId !== identity.row.id ||
    intentRow.profileVersion !== profileRow.version ||
    intentRow.briefFingerprint !== fingerprint
  )
    throw new DirectionError(
      "Approve a source-grounded visual-intent brief for this character first.",
    );
  const intent = visualIntentSchema.parse(intentRow.content);
  let references;
  try {
    references = currentImageReferences({
      pack,
      identityId: identity.row.id,
      adaptation: identity.view.adaptation,
      profileVersion: profileRow.version,
      year,
      quarter,
      variant: request.variant,
      slot: request.slot,
    });
  } catch (error) {
    throw new DirectionError(
      error instanceof Error
        ? error.message
        : "Review the character references first.",
    );
  }
  const variant = (
    request.slot ? sceneTemplateKey(request.slot) : request.variant
  ) as ImagePromptVariant;
  const authoredContext =
    variant !== "reference-sheet" && !request.draftTemplate
      ? await loadImagePromptContext(userId, year, quarter)
      : null;
  const groupKey = request.slot
    ? `chapter-${request.slot.chapter}`
    : variant === "portrait"
      ? "portrait"
      : "banners";
  const batch = authoredContext
    ? request.batchId
      ? await prisma.livingImagePromptBatch.findFirst({
          where: {
            id: request.batchId,
            userId,
            packId: pack.id,
            groupKey,
            status: "READY",
            input: {
              path: ["coreFingerprint"],
              equals: authoredContext.coreFingerprint,
            },
          },
        })
      : await findWrittenPromptBatch(
          userId,
          pack.id,
          groupKey,
          authoredContext.coreFingerprint,
          pack.activeSceneAttemptId,
        )
    : null;
  if (
    pack.imagePromptMode === "AI_AUTHORED" &&
    variant !== "reference-sheet" &&
    !request.allowTemplateOnly &&
    !request.draftTemplate &&
    !batch
  )
    throw new PromptError(
      "Generate the image prompt first. No image call was started.",
    );
  if (batch && request.slot) {
    const savedInput = z
      .object({ sceneAttemptId: z.string().nullable() })
      .parse(batch.input);
    if (savedInput.sceneAttemptId !== pack.activeSceneAttemptId)
      throw new PromptError(
        "This prompt belongs to another scene attempt. Open the selected attempt first.",
        undefined,
        409,
      );
  }
  const packageKey = `${variant}:${request.resolution ?? "2K"}:${promptReceiptFingerprint(references)}`;
  const savedPackages =
    batch &&
    typeof batch.packages === "object" &&
    batch.packages !== null &&
    !Array.isArray(batch.packages)
      ? (batch.packages as Record<string, unknown>)
      : {};
  if (request.receipt && batch) {
    const claimed = Object.values(savedPackages).find(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        "receipt" in value &&
        value.receipt === request.receipt,
    ) as ImagePromptPackage | undefined;
    if (claimed?.variant === variant) return claimed;
    throw new PromptError(
      "The copied prompt no longer matches this character or image slot. Open the current prompt and retry.",
      undefined,
      409,
    );
  }
  if (savedPackages[packageKey])
    return savedPackages[packageKey] as ImagePromptPackage;
  const published = batch
    ? z
        .object({
          templates: z.array(
            z.object({
              key: z.string(),
              version: z.number(),
              text: z.string(),
              authoring: z.unknown().optional(),
            }),
          ),
        })
        .parse(batch.input).templates
    : await getPublishedImageTemplates(userId);
  const templates = published.map((template) =>
    template.key === request.draftTemplate?.key
      ? request.draftTemplate
      : template,
  );
  const direction = batch
    ? writtenPromptBatchSchema
        .parse(batch.content)
        .directions.find((item) => item.key === variant)
    : null;
  if (batch && !direction)
    throw new PromptError(
      "The saved prompt batch is incomplete. Regenerate it before creating artwork.",
    );
  const writerRun = batch?.nexoRunId
    ? await prisma.nexoRun.findFirst({
        where: { id: batch.nexoRunId, userId, status: "READY" },
      })
    : null;
  const writerProfile = writerRun
    ? z
        .object({
          profile: z.object({ provider: z.string(), model: z.string() }),
        })
        .parse(writerRun.configSnapshot).profile
    : null;
  const result = assembleImagePromptPackage({
    variant,
    slot: request.slot,
    profile,
    visualIntent: intent,
    setting: pack.setting,
    visualBrief: pack.visualBrief,
    identityId: identity.row.id,
    profileVersion: profileRow.version,
    briefRevision: pack.briefRevision,
    intentVersion: intentRow.version,
    references,
    templates,
    resolution: request.resolution,
    sourceFingerprint: authoredContext?.coreFingerprint,
    ...(batch && direction && writerProfile && writerRun
      ? {
          written: {
            description: direction.description,
            authorship: {
              batchId: batch.id,
              version: batch.version,
              nexoRunId: writerRun.id,
              inputFingerprint: batch.inputFingerprint,
              ...writerProfile,
            },
          },
        }
      : {}),
    promptOverride:
      variant === "reference-sheet" && !request.ignoreReferenceOverride
        ? pack.referencePromptOverride
        : null,
  });
  if (batch) {
    if (!result.authorship)
      throw new PromptError(
        "The saved prompt has no confirmed AI writing receipt. Regenerate it before use.",
      );
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`image-prompt-package:${batch.id}`},0))::text`;
      const current = await tx.livingImagePromptBatch.findUniqueOrThrow({
        where: { id: batch.id },
      });
      const packages = current.packages as Record<string, unknown>;
      if (packages[packageKey])
        return packages[packageKey] as ImagePromptPackage;
      await tx.livingImagePromptBatch.update({
        where: { id: batch.id },
        data: { packages: jsonValue({ ...packages, [packageKey]: result }) },
      });
      return result;
    });
  }
  return result;
}

export function publicImagePromptPackage(pack: ImagePromptPackage) {
  return {
    ...pack,
    references: pack.references.map(({ kind, id, href }) => ({
      kind,
      id,
      href,
    })),
  };
}
