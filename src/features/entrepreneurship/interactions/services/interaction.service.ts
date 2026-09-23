import {
  captureAudience,
  captureAudienceContext,
  audienceSnapshot,
} from "@/features/entrepreneurship/audiences/services/audience.service";
import { saveCapturedObservations } from "@/features/entrepreneurship/observations/services/captured-observation.service";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
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
  personId: string | null,
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
        personId: string | null;
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
      personId: string | null;
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
    if (
      next === parentId &&
      personId &&
      revision.personId &&
      personId !== revision.personId
    )
      throw new BusinessError(
        "A reply and its source must refer to the same person.",
      );
    next = revision.respondsToInteractionId;
  }
}

async function interactionValues(
  tx: Prisma.TransactionClient,
  userId: string,
  data: z.output<typeof interactionSchema>,
  interactionId: string | null,
  preservedContext?: Prisma.AudienceContextGetPayload<{
    include: { segments: true };
  }> | null,
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
  const audience = await captureAudience(
    tx,
    userId,
    data,
    data.nicheId,
    preservedContext,
  );
  if (audience.identityKind === "GROUP")
    throw new BusinessError(
      "Keep aggregate findings as an observation or public source.",
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
    audience.companyId,
    audience.personId,
  );
  return {
    userId,
    sourceSessionId: data.sourceSessionId,
    ...audience,
    nicheId: niche?.id ?? null,
    nicheSnapshot: niche?.name ?? null,
    kind: data.kind,
    channel: data.channel,
    platform: data.platform ?? null,
    occurredAt: data.occurredAt,
    summary: data.summary,
    notes: data.notes,
    participants: data.participants,
    linkedParticipants: {
      create: await Promise.all(
        data.participants
          .filter((p) => p.personId)
          .map(async (p) => {
            const person = await tx.person.findFirst({
              where: { id: p.personId!, userId, archivedAt: null },
            });
            if (!person)
              throw new BusinessError("Choose participants you own.");
            if (niche)
              await tx.personNiche.upsert({
                where: {
                  personId_nicheId: { personId: person.id, nicheId: niche.id },
                },
                create: { userId, personId: person.id, nicheId: niche.id },
                update: {},
              });
            return {
              personId: person.id,
              nameSnapshot: person.name,
              roleSnapshot: p.role,
            };
          }),
      ),
    },
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
      ...audienceSnapshot(values),
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
  const personIds = [...new Set(data.personIds)].sort();
  return captureOnce(userId, key, input, async (tx) => {
    const companies = await tx.company.findMany({
      where: { id: { in: ids }, userId, archivedAt: null },
    });
    if (companies.length !== ids.length)
      throw new BusinessError("Choose active companies you own.");
    const people = await tx.person.findMany({
      where: { userId, id: { in: personIds }, archivedAt: null },
    });
    if (people.length !== personIds.length)
      throw new BusinessError("Choose active people you own.");
    const recipientKeys = [...ids, ...personIds.map((id) => `person:${id}`)];
    if (Object.keys(data.overrides).some((id) => !recipientKeys.includes(id)))
      throw new BusinessError("Overrides must belong to selected recipients.");
    let first = "";
    const niche = data.nicheId
      ? await tx.niche.findFirst({
          where: { id: data.nicheId, userId, archivedAt: null },
        })
      : null;
    if (data.nicheId && !niche)
      throw new BusinessError("Choose an active exploration you own.");
    const audienceContext = await captureAudienceContext(tx, userId, data);
    const recipients = [
      ...companies.map((c) => ({
        key: c.id,
        companyId: c.id,
        companySnapshot: c.name,
        personId: null as string | null,
        personSnapshot: null as string | null,
      })),
      ...people.map((p) => ({
        key: `person:${p.id}`,
        companyId: null as string | null,
        companySnapshot: null as string | null,
        personId: p.id,
        personSnapshot: p.name,
      })),
    ];
    for (const recipient of recipients) {
      const interaction = await tx.interaction.create({ data: { userId } });
      await tx.interactionRevision.create({
        data: {
          userId,
          interactionId: interaction.id,
          version: 1,
          audienceContextId: audienceContext.id,
          identityKind: recipient.personId ? "PERSON" : "BUSINESS",
          companyId: recipient.companyId,
          companySnapshot: recipient.companySnapshot,
          personId: recipient.personId,
          personSnapshot: recipient.personSnapshot,
          nicheId: niche?.id,
          nicheSnapshot: niche?.name,
          kind: "OUTREACH_SENT",
          channel: data.overrides[recipient.key]?.channel ?? data.channel,
          platform:
            data.overrides[recipient.key]?.platform ?? data.platform ?? null,
          occurredAt:
            data.overrides[recipient.key]?.occurredAt ?? data.occurredAt,
          summary: data.overrides[recipient.key]?.summary ?? data.summary,
          notes:
            data.overrides[recipient.key] &&
            Object.hasOwn(data.overrides[recipient.key], "notes")
              ? data.overrides[recipient.key].notes
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
    const oldContext = prior.audienceContextId
      ? await tx.audienceContext.findUnique({
          where: { id: prior.audienceContextId },
          include: { segments: true },
        })
      : null;
    const sameScope =
      !data.audienceScopeEdited &&
      data.segmentNames.length === 0 &&
      data.marketType === (oldContext?.marketType ?? "UNKNOWN") &&
      data.audienceDescription === (oldContext?.description ?? null) &&
      JSON.stringify([...new Set(data.segmentIds)].sort()) ===
        JSON.stringify(
          (oldContext?.segments.map((s) => s.segmentId) ?? []).sort(),
        );
    const captured = await interactionValues(
      tx,
      userId,
      { ...data, sourceSessionId: prior.sourceSessionId },
      id,
      sameScope ? oldContext : undefined,
    );
    const values: { audienceContextId: string | null } & Omit<
      typeof captured,
      "audienceContextId"
    > = { ...captured };
    if (prior.personId === values.personId)
      values.personSnapshot = prior.personSnapshot;
    if (prior.companyId === values.companyId)
      values.companySnapshot = prior.companySnapshot;
    const hardChange =
      [
        "kind",
        "channel",
        "platform",
        "companyId",
        "personId",
        "identityKind",
        "audienceLabel",
        "sampleSize",
        "sampleUnit",
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
    const newContext = values.audienceContextId
      ? await tx.audienceContext.findUnique({
          where: { id: values.audienceContextId },
          include: { segments: true },
        })
      : null;
    const contextMeaning = (c: typeof oldContext) =>
      JSON.stringify(
        c && {
          marketType: c.marketType,
          description: c.description,
          segments: c.segments
            .map((s) => [s.segmentId, s.nameSnapshot, s.descriptionSnapshot])
            .sort(),
        },
      );
    const materialChange =
      hardChange ||
      contextMeaning(oldContext) !== contextMeaning(newContext) ||
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
    if (prior.personId !== values.personId && values.personId) {
      const replies = await tx.$queryRaw<
        { personId: string | null }[]
      >`SELECT r."personId" FROM interaction i JOIN interaction_revision r ON r."interactionId"=i.id AND r.version=i.version WHERE i."userId"=${userId} AND i."voidedAt" IS NULL AND r."respondsToInteractionId"=${id}`;
      if (replies.some((r) => r.personId && r.personId !== values.personId))
        throw new BusinessError(
          "A linked reply has a different person. Correct the reply first.",
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
