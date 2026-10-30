import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  jsonValue,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import {
  livingArtStateSchema,
  livingArtFormatSchema,
} from "../schemas/living-season.schema";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";

export const livingActiveSnapshotSchema = z.object({
  characterName: z.string(),
  identityId: z.string(),
  briefRevision: z.number(),
  /** Durable proof: cleanup never removes artwork that has been activated. */
  activatedArtworkIds: z.array(z.string()).default([]),
  artwork: z.array(
    z.object({
      id: z.string(),
      chapter: z.number(),
      state: livingArtStateSchema,
      format: livingArtFormatSchema,
      revision: z.number(),
      approvedAt: z.string(),
      focalX: z.number(),
      focalY: z.number(),
    }),
  ),
});
export async function preserveLivingSnapshot(
  packId: string,
  replace = false,
  tx: DirectionTx = prisma,
) {
  const pack = await tx.livingSeasonPack.findUnique({
    where: { id: packId },
    include: {
      artwork: {
        where: { approvedAt: { not: null } },
        orderBy: { revision: "desc" },
      },
    },
  });
  if (!pack || (!replace && (!pack.activeAt || pack.activeSnapshot))) return;
  const identity = await getCotsIdentity(pack.userId, pack.seasonId, tx);
  if (!identity || identity.row.id !== pack.identityId) return;
  const previous = livingActiveSnapshotSchema.safeParse(pack.activeSnapshot);
  const current = pack.artwork.filter(
    (a) =>
      a.identityId === pack.identityId &&
      a.briefRevision === pack.briefRevision &&
      a.sceneAttemptId === pack.activeSceneAttemptId,
  );
  const activatedArtworkIds = [
    ...new Set([
      ...(previous.success ? previous.data.activatedArtworkIds : []),
      ...(previous.success ? previous.data.artwork.map((art) => art.id) : []),
      ...current.map((art) => art.id),
    ]),
  ];
  await tx.livingSeasonPack.update({
    where: { id: packId },
    data: {
      activeSnapshot: jsonValue({
        characterName: identity.view.displayName,
        identityId: pack.identityId,
        briefRevision: pack.briefRevision,
        activatedArtworkIds,
        artwork: pack.artwork
          .filter(
            (a) =>
              a.identityId === pack.identityId &&
              a.briefRevision === pack.briefRevision &&
              a.sceneAttemptId === pack.activeSceneAttemptId,
          )
          .map(
            ({
              id,
              chapter,
              state,
              format,
              revision,
              approvedAt,
              focalX,
              focalY,
            }) => ({
              id,
              chapter,
              state,
              format,
              revision,
              approvedAt: approvedAt!.toISOString(),
              focalX,
              focalY,
            }),
          ),
      }),
    },
  });
}
