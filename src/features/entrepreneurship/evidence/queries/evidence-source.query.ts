import { Prisma } from "@/generated/prisma/client";
import { audienceInclude } from "@/features/entrepreneurship/audiences/utils/audience.util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

/** Read the current source and current, non-withdrawn observations together. */
export function getEvidenceSourceDetail(
  userId: string,
  id: string,
  nicheId?: string,
) {
  return prisma.$transaction(
    async (db) => {
      const interaction = await db.interaction.findFirst({
        where: { id, userId, voidedAt: null },
        include: {
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            include: { audienceContext: audienceInclude },
          },
        },
      });
      const revision = interaction?.revisions[0];
      if (
        !interaction ||
        !revision ||
        revision.kind !== "CONVERSATION" ||
        (nicheId && revision.nicheId !== nicheId)
      )
        return null;

      const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT o.id FROM observation o
        JOIN observation_revision r ON r."observationId" = o.id
          AND r.version = o.version AND r."userId" = o."userId"
        WHERE o."userId" = ${userId} AND o."voidedAt" IS NULL
          AND r."interactionId" = ${id}
        ORDER BY r."observedAt" DESC, o.id DESC
      `);
      const observations = await db.observation.findMany({
        where: { userId, id: { in: rows.map((row) => row.id) } },
        include: {
          revisions: {
            orderBy: { version: "desc" },
            take: 1,
            include: { audienceContext: audienceInclude },
          },
        },
      });
      const byId = new Map(
        observations.map((observation) => [observation.id, observation]),
      );

      return {
        source: { ...revision, id: interaction.id },
        observations: rows.flatMap((row) => {
          const current = byId.get(row.id)?.revisions[0];
          return current
            ? [
                {
                  id: row.id,
                  version: current.version,
                  kind: current.kind,
                  wordingMode: current.wordingMode,
                  statement: current.statement,
                  observedAt: current.observedAt,
                  sourceKind: current.sourceKind,
                  sourceDescription: current.sourceDescription,
                  sourceUrl: current.sourceUrl,
                  correctionReason: current.correctionReason,
                  identityKind: current.identityKind,
                  nicheId: current.nicheId,
                  nicheSnapshot: current.nicheSnapshot,
                  audienceContextId: current.audienceContextId,
                  audienceContext: current.audienceContext,
                  personSnapshot: current.personSnapshot,
                  companySnapshot: current.companySnapshot,
                  audienceLabel: current.audienceLabel,
                  sampleSize: current.sampleSize,
                  sampleUnit: current.sampleUnit,
                },
              ]
            : [];
        }),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000 },
  );
}
