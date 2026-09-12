import { linkIdeaOutput } from "@/features/direction/thinking/services/idea-output.service";
import { DuplicatePublicationError } from "@/features/content/publications/types/publication-error.types";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { contentCommandSchema } from "@/features/content/schemas/content.schema";
import {
  DirectionError,
  fingerprint,
  jsonValue,
  lockDirection,
  requireVersion,
  storedDate,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import {
  publicationIdentity,
  validatePublicationDate,
} from "@/features/content/publications/utils/publication-identity.util";
import type {
  ContentIntent,
  ContentFormat,
  PublicationDraft,
  ChannelPlatform,
} from "@/features/content/types/content.types";
import { DateTime } from "luxon";

type ContentMutationResult = {
  id: string;
  contentId?: string;
  version?: number;
  writingVersion?: number;
  variantId?: string;
  publicationIds?: string[];
};

export async function createContentInTransaction(
  tx: DirectionTx,
  userId: string,
  draft: ContentIntent,
  format: ContentFormat,
  ideaId?: string,
) {
  const row = await tx.content.create({
    data: {
      userId,
      ...draft,
      variants: {
        create: {
          name:
            format === "SHORT_VERTICAL"
              ? "Short vertical"
              : format === "LONG_FORM"
                ? "Long form"
                : "First version",
          format,
        },
      },
    },
  });
  if (ideaId)
    await linkIdeaOutput(tx, userId, ideaId, { contentId: row.id }, "CREATED");
  return { id: row.id, contentId: row.id, version: row.version };
}
async function publicationValues(
  tx: DirectionTx,
  userId: string,
  variantId: string,
  draft: PublicationDraft,
  allowArchivedChannel = false,
) {
  validatePublicationDate(draft);
  const channel = await tx.channel.findFirst({
    where: { id: draft.channelId, userId },
  });
  if (!channel || (channel.archivedAt && !allowArchivedChannel))
    throw new DirectionError(
      "Choose an available channel you own.",
      "channelId",
    );
  const identity = publicationIdentity(
    channel.platform as ChannelPlatform,
    variantId,
    draft,
  );
  return {
    channelId: channel.id,
    publishedTitle: draft.publishedTitle,
    publishedOn: storedDate(draft.publishedOn),
    publishedAt: draft.publishedAt ? new Date(draft.publishedAt) : null,
    url: identity.url,
    placement: draft.placement,
    identityKey: identity.key,
  };
}
export async function executeContentCommand(userId: string, input: unknown) {
  const c = contentCommandSchema.parse(input),
    hash = fingerprint(c);
  return prisma.$transaction(
    async (tx) => {
      await lockDirection(tx, userId, `content-operation:${c.operationKey}`);
      const receipt = await tx.contentMutation.findUnique({
        where: {
          userId_operationKey: { userId, operationKey: c.operationKey },
        },
      });
      if (receipt) {
        if (receipt.fingerprint !== hash)
          throw new DirectionError(
            "This submission was already used with different values.",
            undefined,
            409,
          );
        return receipt.result as ContentMutationResult;
      }
      let result: ContentMutationResult;
      if (c.type === "CREATE_CONTENT")
        result = await createContentInTransaction(
          tx,
          userId,
          c.draft,
          c.format,
          c.ideaId,
        );
      else if (c.type === "SAVE_CHANNEL") {
        if (c.id) await lockDirection(tx, userId, `channel:${c.id}`);
        const old = c.id
          ? await tx.channel.findFirst({ where: { id: c.id, userId } })
          : null;
        if (c.id && !old)
          throw new DirectionError("Channel not found.", undefined, 404);
        if (old) {
          requireVersion(old.version, c.expectedVersion);
          if (old.platform !== c.draft.platform)
            throw new DirectionError(
              "A channel's platform cannot change. Add another channel instead.",
              "platform",
            );
        }
        const identity = (
          (c.draft.platform === "OTHER"
            ? `${c.draft.platformLabel ?? "Other"}:`
            : "") + (c.draft.account || c.draft.name)
        )
          .trim()
          .normalize("NFKC")
          .toLowerCase();
        const data = {
          ...c.draft,
          identity,
          platformLabel: c.draft.platformLabel ?? "",
          archivedAt: c.archived ? new Date() : null,
        };
        const row = old
          ? await tx.channel.update({
              where: { id: old.id },
              data: { ...data, version: { increment: 1 } },
            })
          : await tx.channel.create({ data: { ...data, userId } });
        result = { id: row.id, version: row.version };
      } else {
        if (c.type !== "SAVE_WRITING" && c.type !== "SAVE_CONTENT")
          await lockDirection(tx, userId, `content:${c.contentId}`);
        const content = await tx.content.findFirst({
          where: { id: c.contentId, userId },
        });
        if (!content)
          throw new DirectionError("Content not found.", undefined, 404);
        const canWriteArchived = [
          "ARCHIVE_CONTENT",
          "CORRECT_PUBLICATION",
          "WITHDRAW_PUBLICATION",
          "RECORD_OBSERVATION",
        ].includes(c.type);
        // Claim the aggregate revision before touching child rows. The conditional
        // update checks current archival state after any concurrent writer commits.
        // Writing retains its own optimistic revision; no advisory note lock is needed.
        const claimed = await tx.content.updateMany({
          where: {
            id: content.id,
            userId,
            ...(canWriteArchived ? {} : { archivedAt: null }),
          },
          data: { workspaceVersion: { increment: 1 }, updatedAt: new Date() },
        });
        if (!claimed.count)
          throw new DirectionError(
            "Restore this work before editing it.",
            undefined,
            409,
          );
        result = { id: content.id, contentId: content.id };
        if (c.type === "SAVE_CONTENT" || c.type === "ARCHIVE_CONTENT") {
          const changed = await tx.content.updateMany({
            where: { id: content.id, userId, version: c.expectedVersion },
            data: {
              ...(c.type === "SAVE_CONTENT"
                ? c.draft
                : { archivedAt: c.archived ? new Date() : null }),
              version: { increment: 1 },
            },
          });
          if (!changed.count)
            throw new DirectionError(
              "This work changed in another tab. Review the latest version before saving.",
              undefined,
              409,
            );
          result.version = c.expectedVersion + 1;
        } else if (c.type === "CREATE_VARIANT") {
          const row = await tx.contentVariant.create({
            data: {
              userId,
              contentId: content.id,
              name: c.name,
              format: c.format,
            },
          });
          result.id = row.id;
          result.variantId = row.id;
        } else if (
          c.type === "SAVE_WRITING" ||
          c.type === "SAVE_VARIANT" ||
          c.type === "PUBLISH"
        ) {
          const variant = await tx.contentVariant.findFirst({
            where: { id: c.variantId, contentId: content.id, userId },
          });
          if (!variant)
            throw new DirectionError(
              "This version does not belong to the work.",
              undefined,
              404,
            );
          result.variantId = variant.id;
          if (variant.archivedAt && c.type !== "SAVE_VARIANT")
            throw new DirectionError("Restore this version before using it.");
          if (c.type === "SAVE_WRITING") {
            const changed = await tx.contentVariant.updateMany({
              where: {
                id: variant.id,
                userId,
                writingVersion: c.expectedWritingVersion,
              },
              data: {
                ...c.draft,
                writingVersion: { increment: 1 },
                writingSavedAt: new Date(),
              },
            });
            if (!changed.count)
              throw new DirectionError(
                "This writing changed in another tab. Your draft is preserved; compare the latest copy before retrying.",
                undefined,
                409,
              );
            result.writingVersion = c.expectedWritingVersion + 1;
          } else if (c.type === "SAVE_VARIANT") {
            const changed = await tx.contentVariant.updateMany({
              where: { id: variant.id, userId, version: c.expectedVersion },
              data: {
                name: c.name,
                format: c.format,
                stage: c.stage,
                nextStep: c.nextStep,
                plannedOn: c.plannedOn ? storedDate(c.plannedOn) : null,
                archivedAt: c.archived ? new Date() : null,
                version: { increment: 1 },
              },
            });
            if (!changed.count)
              throw new DirectionError(
                "This version changed in another tab.",
                undefined,
                409,
              );
            result.version = c.expectedVersion + 1;
          } else {
            result.publicationIds = [];
            for (const draft of c.publications) {
              const values = await publicationValues(
                tx,
                userId,
                variant.id,
                draft,
              );
              const duplicate = await tx.publication.findUnique({
                where: {
                  userId_identityKey: {
                    userId,
                    identityKey: values.identityKey,
                  },
                },
                include: { variant: { select: { contentId: true } } },
              });
              if (duplicate)
                throw new DuplicatePublicationError({
                  id: duplicate.id,
                  contentId: duplicate.variant.contentId,
                  href: `/content/${duplicate.variant.contentId}`,
                  title: duplicate.publishedTitle,
                });
              const row = await tx.publication.create({
                data: { userId, variantId: variant.id, ...values },
              });
              result.publicationIds.push(row.id);
              await tx.publicationRevision.create({
                data: {
                  userId,
                  publicationId: row.id,
                  version: row.version,
                  kind: "PUBLISHED",
                  reason: "Manually recorded release.",
                  snapshot: jsonValue(row),
                },
              });
            }
          }
          await tx.content.update({
            where: { id: content.id },
            data: { updatedAt: new Date() },
          });
        } else {
          const publication = await tx.publication.findFirst({
            where: {
              id: c.publicationId,
              userId,
              variant: { contentId: content.id },
            },
          });
          if (!publication)
            throw new DirectionError(
              "Release not found in this work.",
              undefined,
              404,
            );
          result.variantId = publication.variantId;
          result.publicationIds = [publication.id];
          if (c.type === "RECORD_OBSERVATION") {
            if (publication.withdrawnAt)
              throw new DirectionError(
                "Restore the release record before recording results.",
              );
            const observed = new Date(c.draft.observedAt);
            const releasedAt =
              publication.publishedAt ??
              DateTime.fromISO(
                publication.publishedOn.toISOString().slice(0, 10),
                { zone: "Europe/Amsterdam" },
              ).toJSDate();
            if (observed > new Date() || observed < releasedAt)
              throw new DirectionError(
                "The observation must be after release and no later than now.",
                "observedAt",
              );
            if (c.supersedesId) {
              const prior = await tx.performanceObservation.findFirst({
                where: {
                  id: c.supersedesId,
                  userId,
                  publicationId: publication.id,
                  supersededBy: { none: {} },
                },
              });
              if (!prior || !c.reason)
                throw new DirectionError(
                  "Choose the current observation and explain the correction.",
                  undefined,
                  409,
                );
            }
            const row = await tx.performanceObservation.create({
              data: {
                userId,
                publicationId: publication.id,
                observedAt: observed,
                views: c.draft.views === null ? null : BigInt(c.draft.views),
                likes: c.draft.likes === null ? null : BigInt(c.draft.likes),
                comments:
                  c.draft.comments === null ? null : BigInt(c.draft.comments),
                note: c.draft.note,
                supersedesId: c.supersedesId,
                correctionReason: c.reason,
              },
            });
            result.id = row.id;
          } else {
            requireVersion(publication.version, c.expectedVersion);
            const values =
              c.type === "CORRECT_PUBLICATION"
                ? await publicationValues(
                    tx,
                    userId,
                    publication.variantId,
                    c.draft,
                    true,
                  )
                : {
                    withdrawnAt: c.withdrawn ? new Date() : null,
                    withdrawalReason: c.withdrawn ? c.reason : null,
                  };
            if ("identityKey" in values) {
              const duplicate = await tx.publication.findUnique({
                where: {
                  userId_identityKey: {
                    userId,
                    identityKey: values.identityKey,
                  },
                },
                include: { variant: { select: { contentId: true } } },
              });
              if (duplicate && duplicate.id !== publication.id)
                throw new DuplicatePublicationError({
                  id: duplicate.id,
                  contentId: duplicate.variant.contentId,
                  href: `/content/${duplicate.variant.contentId}`,
                  title: duplicate.publishedTitle,
                });
            }
            const row = await tx.publication.update({
              where: { id: publication.id },
              data: { ...values, version: { increment: 1 } },
            });
            await tx.publicationRevision.create({
              data: {
                userId,
                publicationId: row.id,
                version: row.version,
                kind:
                  c.type === "CORRECT_PUBLICATION"
                    ? "CORRECTED"
                    : c.withdrawn
                      ? "WITHDRAWN"
                      : "RESTORED",
                reason: c.reason,
                snapshot: jsonValue(row),
              },
            });
            result.version = row.version;
          }
        }
      }
      if (c.type === "CREATE_CONTENT" && result.contentId)
        await tx.content.update({
          where: { id: result.contentId },
          data: { workspaceVersion: { increment: 1 }, updatedAt: new Date() },
        });
      await tx.contentMutation.create({
        data: {
          userId,
          operationKey: c.operationKey,
          fingerprint: hash,
          result: jsonValue(result),
        },
      });
      return result;
    },
    { timeout: 15000 },
  );
}
