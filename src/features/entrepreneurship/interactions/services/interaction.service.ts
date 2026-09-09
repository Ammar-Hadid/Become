import { saveCapturedObservations } from "@/features/entrepreneurship/observations/services/captured-observation.service";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { resolveCompany } from "@/features/entrepreneurship/market/services/market.service";
import {
  interactionSchema,
  correctionSchema,
  batchOutreachSchema,
} from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import type { z } from "zod";

async function validateReply(
  tx: Prisma.TransactionClient,
  userId: string,
  parentId: string | null,
  interactionId: string | null,
  companyId: string | null,
) {
  if (!parentId) return;
  const visited = new Set(interactionId ? [interactionId] : []);
  let next: string | null = parentId;
  while (next) {
    if (visited.has(next))
      throw new BusinessError("Reply links cannot form a loop.");
    visited.add(next);
    const parent: {
      voidedAt: Date | null;
      revisions: {
        companyId: string | null;
        respondsToInteractionId: string | null;
      }[];
    } | null = await tx.interaction.findFirst({
      where: { id: next, userId },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!parent || parent.voidedAt)
      throw new BusinessError("Choose an available interaction you own.");
    const revision: {
      companyId: string | null;
      respondsToInteractionId: string | null;
    } = parent.revisions[0];
    if (
      next === parentId &&
      companyId &&
      revision.companyId &&
      companyId !== revision.companyId
    )
      throw new BusinessError(
        "A reply and its source must refer to the same company.",
      );
    next = revision.respondsToInteractionId;
  }
}

async function interactionValues(
  tx: Prisma.TransactionClient,
  userId: string,
  data: z.output<typeof interactionSchema>,
  interactionId: string | null,
) {
  if (
    data.sourceSessionId &&
    !(await tx.session.findFirst({
      where: {
        id: data.sourceSessionId,
        userId,
        endedAt: { not: null },
        domain: { slug: "entrepreneurship" },
      },
    }))
  )
    throw new BusinessError("Choose your completed Entrepreneurship session.");
  const company = await resolveCompany(
    tx,
    userId,
    data.companyId,
    data.companyName,
  );
  const niche = data.nicheId
    ? await tx.niche.findFirst({
        where: { id: data.nicheId, userId, archivedAt: null },
      })
    : null;
  if (data.nicheId && !niche)
    throw new BusinessError("Choose an active niche you own.");
  await validateReply(
    tx,
    userId,
    data.respondsToInteractionId ?? null,
    interactionId,
    company?.id ?? null,
  );
  return {
    userId,
    sourceSessionId: data.sourceSessionId,
    companyId: company?.id ?? null,
    companySnapshot: company?.name ?? null,
    nicheId: niche?.id ?? null,
    nicheSnapshot: niche?.name ?? null,
    kind: data.kind,
    channel: data.channel,
    occurredAt: data.occurredAt,
    summary: data.summary,
    notes: data.notes,
    participants: data.participants,
    respondsToInteractionId: data.respondsToInteractionId,
  };
}

export async function logInteraction(
  userId: string,
  key: string,
  input: unknown,
) {
  const data = interactionSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    // One per-user graph lock also protects reply corrections from concurrent cycles.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`business-graph:${userId}`}, 0))::text`;
    const values = await interactionValues(tx, userId, data, null);
    const interaction = await tx.interaction.create({ data: { userId } });
    const revision = await tx.interactionRevision.create({
      data: { ...values, interactionId: interaction.id, version: 1 },
    });
    await saveCapturedObservations(tx, userId, data.observations, {
      observedAt: values.occurredAt,
      companyId: values.companyId,
      companySnapshot: values.companySnapshot,
      nicheId: values.nicheId,
      nicheSnapshot: values.nicheSnapshot,
      interactionId: interaction.id,
      interactionRevisionId: revision.id,
    });
    if (data.followUp)
      await tx.followUp.create({
        data: { userId, interactionId: interaction.id, ...data.followUp },
      });
    return interaction.id;
  });
}

export async function logBatchOutreach(
  userId: string,
  key: string,
  input: unknown,
) {
  const parsed = batchOutreachSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.path[0] === "overrides") {
      const company = await prisma.company.findFirst({
        where: { id: String(issue.path[1]), userId },
        select: { name: true },
      });
      throw new BusinessError(
        `Recipient ${company?.name ?? "selection"} · ${String(issue.path[2] ?? "values")}: ${issue.message}`,
      );
    }
    throw parsed.error;
  }
  const data = parsed.data;
  const ids = [...new Set(data.companyIds)].sort();
  return captureOnce(userId, key, input, async (tx) => {
    const companies = await tx.company.findMany({
      where: { id: { in: ids }, userId, archivedAt: null },
    });
    if (companies.length !== ids.length)
      throw new BusinessError("Choose active companies you own.");
    if (Object.keys(data.overrides).some((id) => !ids.includes(id)))
      throw new BusinessError("Overrides must belong to selected recipients.");
    let first = "";
    const niche = data.nicheId
      ? await tx.niche.findFirst({
          where: { id: data.nicheId, userId, archivedAt: null },
        })
      : null;
    if (data.nicheId && !niche)
      throw new BusinessError("Choose an active exploration you own.");
    for (const company of companies) {
      const interaction = await tx.interaction.create({ data: { userId } });
      await tx.interactionRevision.create({
        data: {
          userId,
          interactionId: interaction.id,
          version: 1,
          companyId: company.id,
          companySnapshot: company.name,
          nicheId: niche?.id,
          nicheSnapshot: niche?.name,
          kind: "OUTREACH_SENT",
          channel: data.overrides[company.id]?.channel ?? data.channel,
          occurredAt: data.overrides[company.id]?.occurredAt ?? data.occurredAt,
          summary: data.overrides[company.id]?.summary ?? data.summary,
          notes:
            data.overrides[company.id] &&
            Object.hasOwn(data.overrides[company.id], "notes")
              ? data.overrides[company.id].notes
              : data.notes,
        },
      });
      first ||= interaction.id;
    }
    return first;
  });
}

export async function correctInteraction(
  userId: string,
  id: string,
  key: string,
  input: unknown,
) {
  const data = correctionSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`business-graph:${userId}`}, 0))::text`;
    const record = await tx.interaction.findFirst({
      where: { id, userId, voidedAt: null },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!record || record.version !== data.expectedVersion)
      throw new BusinessError(
        "This interaction changed. Your edits are preserved; open its latest version before correcting it.",
      );
    const prior = record.revisions[0];
    const values = await interactionValues(
      tx,
      userId,
      { ...data, sourceSessionId: prior.sourceSessionId },
      id,
    );
    const hardChange =
      [
        "kind",
        "channel",
        "companyId",
        "nicheId",
        "respondsToInteractionId",
      ].some(
        (field) =>
          prior[field as keyof typeof prior] !==
          values[field as keyof typeof values],
      ) ||
      prior.occurredAt.getTime() !== values.occurredAt.getTime() ||
      JSON.stringify(prior.participants) !==
        JSON.stringify(values.participants);
    const materialChange =
      hardChange ||
      (prior.summary !== values.summary && !data.meaningUnchanged);
    // Correcting a source company must also be consistent with its current replies.
    if (prior.companyId !== values.companyId && values.companyId) {
      const replies = await tx.$queryRaw<
        { companyId: string | null }[]
      >`SELECT r."companyId" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."respondsToInteractionId"=${id}`;
      if (replies.some((r) => r.companyId && r.companyId !== values.companyId))
        throw new BusinessError(
          "A linked reply has a different company. Correct the reply context first.",
        );
    }
    await tx.interactionRevision.create({
      data: {
        ...values,
        interactionId: id,
        version: record.version + 1,
        correctionReason: data.correctionReason,
        materialChange,
      },
    });
    await tx.interaction.update({
      where: { id_userId: { id, userId } },
      data: { version: { increment: 1 } },
    });
    return id;
  });
}

export async function voidInteraction(
  userId: string,
  id: string,
  reason: string,
) {
  if (!reason.trim())
    throw new BusinessError("Explain why this interaction is being withdrawn.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`business-graph:${userId}`}, 0))::text`;
    return tx.interaction.update({
      where: { id_userId: { id, userId } },
      data: { voidedAt: new Date(), voidReason: reason.trim().slice(0, 2000) },
    });
  });
}
