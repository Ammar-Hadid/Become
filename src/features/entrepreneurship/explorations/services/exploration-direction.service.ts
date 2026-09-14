import type { Prisma } from "@/generated/prisma/client";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
export async function captureDirectionSources(
  tx: Prisma.TransactionClient,
  userId: string,
  nicheId: string,
  keys: string[],
) {
  const snapshots: Prisma.InputJsonObject[] = [];
  for (const key of [...new Set(keys)]) {
    const [kind, id] = key.split(":");
    // A carried-forward citation keeps its captured edition, including after correction.
    const prior = await tx.nicheDecision.findFirst({
      where: {
        userId,
        nicheId,
        sourceSnapshots: { array_contains: [{ key }] },
      },
      orderBy: { createdAt: "desc" },
    });
    const saved = Array.isArray(prior?.sourceSnapshots)
      ? prior.sourceSnapshots.find(
          (s) =>
            s && typeof s === "object" && !Array.isArray(s) && s.key === key,
        )
      : null;
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      snapshots.push({ ...saved, carriedFromDecisionId: prior!.id });
      continue;
    }
    if (kind === "INTERACTION") {
      const row = await tx.interactionRevision.findFirst({
        where: { id, userId, nicheId, interaction: { voidedAt: null } },
        include: { interaction: true },
      });
      if (!row || row.version !== row.interaction.version)
        throw new BusinessError(
          "Choose a current source from this exploration.",
        );
      snapshots.push({
        key,
        kind,
        id: row.interactionId,
        revisionId: row.id,
        label: row.summary,
        occurredAt: row.occurredAt.toISOString(),
        audienceContextId: row.audienceContextId,
      });
    } else if (kind === "OBSERVATION") {
      const row = await tx.observationRevision.findFirst({
        where: { id, userId, nicheId, observation: { voidedAt: null } },
        include: {
          observation: true,
          interactionRevision: { include: { interaction: true } },
        },
      });
      if (
        !row ||
        row.version !== row.observation.version ||
        row.interactionRevision?.interaction.voidedAt
      )
        throw new BusinessError(
          "Choose a current source from this exploration.",
        );
      snapshots.push({
        key,
        kind,
        id: row.observationId,
        revisionId: row.id,
        label: row.statement,
        occurredAt: row.observedAt.toISOString(),
        audienceContextId: row.audienceContextId,
      });
    } else if (kind === "OFFER_EVENT") {
      const row = await tx.offerEvent.findFirst({
        where: {
          id,
          userId,
          retractedAt: null,
          offer: { niches: { some: { nicheId } } },
        },
        include: { revision: true },
      });
      if (!row)
        throw new BusinessError(
          "Choose an offer response from this exploration.",
        );
      snapshots.push({
        key,
        kind,
        id: row.id,
        offerId: row.offerId,
        revisionId: row.offerRevisionId,
        label: `${row.kind} · ${row.revision.title}`,
        occurredAt: row.occurredAt.toISOString(),
      });
    } else throw new BusinessError("Choose an available source.");
  }
  return snapshots;
}
