import type { Prisma } from "@/generated/prisma/client";
import { saveCapturedObservations } from "@/features/entrepreneurship/observations/services/captured-observation.service";
import { connectCompanyWorkSource } from "@/features/entrepreneurship/market/services/company-work-source.service";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import {
  quoteSchema,
  offerEventSchema,
  offerResponseSchema,
} from "@/features/entrepreneurship/offers/schemas/offer.schema";
import { quoteMoney } from "@/features/entrepreneurship/offers/utils/offer.util";
import {
  captureAudience,
  targetAudience,
  audienceSnapshot,
} from "@/features/entrepreneurship/audiences/services/audience.service";

async function lockOffer(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  await tx.$queryRaw`SELECT id FROM offer WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
  const offer = await tx.offer.findFirst({
    where: { id, userId, archivedAt: null },
    include: { engagements: true, niches: true },
  });
  if (!offer) throw new BusinessError("Choose an available offer you own.");
  return offer;
}
async function responseSource(
  tx: Prisma.TransactionClient,
  userId: string,
  identity: { personId: string | null; companyId: string | null },
  interactionId?: string | null,
  revisionId?: string | null,
) {
  if (!interactionId && !revisionId) return null;
  const source = await tx.interactionRevision.findFirst({
    where: { id: revisionId ?? "", interactionId: interactionId ?? "", userId },
    include: { interaction: true },
  });
  if (
    !source ||
    source.interaction.voidedAt ||
    source.version !== source.interaction.version ||
    source.companyId !== identity.companyId ||
    source.personId !== identity.personId
  )
    throw new BusinessError(
      "Choose the current source interaction for this recipient.",
    );
  return source;
}
export async function saveOfferRevision(
  userId: string,
  offerId: string | null,
  key: string,
  input: unknown,
) {
  const data = quoteSchema.parse(input);
  let money: ReturnType<typeof quoteMoney>;
  try {
    money = quoteMoney(data.amount, data.currency);
  } catch (e) {
    throw new BusinessError((e as Error).message);
  }
  if (
    data.priceBasis === "RECURRING" &&
    (!data.intervalUnit || !data.intervalCount)
  )
    throw new BusinessError("Choose the recurring quote interval.");
  if (data.priceBasis === "PER_UNIT" && !data.unitLabel)
    throw new BusinessError("Name the quoted unit.");
  if (
    data.mode === "AUDIENCE_TEST" &&
    (data.personId || data.personName || data.companyId || data.companyName)
  )
    throw new BusinessError(
      "An audience test has individual recipients in its response journal.",
    );
  return captureOnce(userId, key, input, async (tx) => {
    const existing = offerId ? await lockOffer(tx, userId, offerId) : null;
    if (existing && existing.mode !== data.mode)
      throw new BusinessError(
        "Keep this offer’s mode when revising its terms.",
      );
    const audience = targetAudience(
      await captureAudience(tx, userId, data, data.nicheId),
    );
    if (
      data.mode === "SPECIFIC" &&
      !audience.personId &&
      !audience.companyId &&
      !audience.audienceLabel
    )
      throw new BusinessError(
        "Choose a person or business, or describe the unnamed recipient.",
      );
    if (data.mode === "SPECIFIC" && audience.identityKind === "GROUP")
      throw new BusinessError("Use an audience test for a group.");
    if (
      existing &&
      data.mode === "SPECIFIC" &&
      (existing.companyId !== audience.companyId ||
        existing.personId !== audience.personId ||
        existing.audienceLabel !== audience.audienceLabel)
    )
      throw new BusinessError(
        "A revision must belong to this offer and its recipient.",
      );
    const offer =
      existing ??
      (await tx.offer.create({
        data: { userId, mode: data.mode, ...audience },
      }));
    if (!existing && data.nicheId) {
      const niche = await tx.niche.findFirst({
        where: { id: data.nicheId, userId, archivedAt: null },
      });
      if (!niche)
        throw new BusinessError("Choose an active exploration you own.");
      await tx.offerNiche.create({
        data: {
          userId,
          offerId: offer.id,
          nicheId: niche.id,
          nicheSnapshot: niche.name,
        },
      });
    }
    if (!existing && data.mode === "SPECIFIC")
      await tx.offerEngagement.create({
        data: { userId, offerId: offer.id, ...audience },
      });
    const ids = [...new Set(data.problemIds)];
    if (
      (await tx.problem.count({
        where: { id: { in: ids }, userId, archivedAt: null },
      })) !== ids.length
    )
      throw new BusinessError("Choose active problems you own.");
    const latest = await tx.offerRevision.findFirst({
      where: { offerId: offer.id, userId },
      orderBy: { version: "desc" },
    });
    if (
      existing &&
      data.expectedVersion != null &&
      latest?.version !== data.expectedVersion
    )
      throw new BusinessError(
        "These offer terms changed. Your edits are preserved; review the latest revision first.",
      );
    const revision = await tx.offerRevision.create({
      data: {
        userId,
        offerId: offer.id,
        ...audience,
        version: (latest?.version ?? 0) + 1,
        title: data.title,
        scope: data.scope,
        terms: data.terms,
        ...money,
        priceBasis: data.priceBasis,
        unitLabel: data.priceBasis === "PER_UNIT" ? data.unitLabel : null,
        intervalUnit:
          data.priceBasis === "RECURRING" ? data.intervalUnit : null,
        intervalCount:
          data.priceBasis === "RECURRING" ? data.intervalCount : null,
        expiresOn: data.expiresOn,
      },
    });
    await tx.offerRevisionProblem.createMany({
      data: ids.map((problemId) => ({
        userId,
        offerId: offer.id,
        offerRevisionId: revision.id,
        problemId,
      })),
    });
    if (existing)
      await tx.offer.update({
        where: { id: offer.id },
        data: { audienceContextId: audience.audienceContextId },
      });
    return offer.id;
  });
}
export async function recordOfferEvent(
  userId: string,
  offerId: string,
  key: string,
  input: unknown,
) {
  const data = offerEventSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const offer = await lockOffer(tx, userId, offerId);
    const revision = await tx.offerRevision.findFirst({
      where: { id: data.offerRevisionId, offerId, userId },
    });
    if (!revision) throw new BusinessError("Choose a revision of this offer.");
    const lifecycle = ["SHARED", "CLOSED", "REOPENED"].includes(data.kind);
    let engagementId = data.engagementId;
    if (offer.mode === "SPECIFIC") {
      if (lifecycle)
        throw new BusinessError(
          "Use proposal outcomes for a specific recipient.",
        );
      engagementId = offer.engagements[0]?.id ?? null;
    } else if (lifecycle) {
      if (engagementId)
        throw new BusinessError(
          "Test sharing and closure do not belong to a recipient.",
        );
    } else if (!engagementId)
      throw new BusinessError("Choose the recipient whose response changed.");
    const engagement = engagementId
      ? offer.engagements.find((e) => e.id === engagementId)
      : null;
    if (engagementId && !engagement)
      throw new BusinessError("Choose a recipient of this offer.");
    const events = await tx.offerEvent.findMany({
      where: {
        userId,
        offerId,
        offerRevisionId: revision.id,
        engagementId: engagementId ?? null,
        retractedAt: null,
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    const current = events[0];
    if (current && data.occurredAt < current.occurredAt)
      throw new BusinessError(
        "This date precedes the latest outcome. Correct that outcome first so the sequence remains clear.",
      );
    if (current?.kind === data.kind)
      throw new BusinessError(
        "That outcome is already recorded for this revision.",
      );
    if (lifecycle) {
      if (data.kind === "SHARED" && events.some((e) => e.kind === "SHARED"))
        throw new BusinessError(
          "These terms were already shared. Record a new revision for different terms.",
        );
      if (data.kind !== "SHARED" && !events.some((e) => e.kind === "SHARED"))
        throw new BusinessError("Record when this test was shared first.");
      if (data.kind === "REOPENED" && current?.kind !== "CLOSED")
        throw new BusinessError("Only a closed test can be reopened.");
    } else if (offer.mode === "SPECIFIC") {
      if (data.kind === "PROPOSED" && revision.proposedAt)
        throw new BusinessError(
          "This revision was already proposed. Create a new revision for different terms.",
        );
      if (
        data.kind !== "PROPOSED" &&
        !events.some((e) => e.kind === "PROPOSED")
      )
        throw new BusinessError(
          "Record the actual proposal before its outcome.",
        );
    } else {
      const shared = await tx.offerEvent.findFirst({
        where: {
          userId,
          offerId,
          offerRevisionId: revision.id,
          engagementId: null,
          kind: "SHARED",
          retractedAt: null,
          occurredAt: { lte: data.occurredAt },
        },
      });
      if (!shared)
        throw new BusinessError(
          "Record sharing these exact terms before recording a response.",
        );
    }
    if (
      data.kind === "EXPIRED" &&
      (!revision.expiresOn ||
        DateTime.fromJSDate(data.occurredAt, {
          zone: APP_TIMEZONE,
        }).toISODate()! <
          DateTime.fromJSDate(revision.expiresOn, { zone: "UTC" }).toISODate()!)
    )
      throw new BusinessError("Expiry must follow the quoted expiry date.");
    const identity = engagement ?? revision;
    const source = await responseSource(
      tx,
      userId,
      identity,
      data.interactionId,
      data.interactionRevisionId,
    );
    if (
      source?.nicheId &&
      offer.niches.length &&
      !offer.niches.some((n) => n.nicheId === source.nicheId)
    )
      throw new BusinessError("Choose a source from this offer’s exploration.");
    const niche = source
      ? source.nicheId
        ? await tx.niche.findFirst({ where: { id: source.nicheId, userId } })
        : null
      : data.nicheId
        ? await tx.niche.findFirst({
            where: { id: data.nicheId, userId, archivedAt: null },
          })
        : null;
    if (!source && data.nicheId && !niche)
      throw new BusinessError("Choose an active exploration you own.");
    const { observations, nicheId, ...eventData } = data;
    void nicheId;
    await tx.offerEvent.create({
      data: {
        ...eventData,
        userId,
        offerId,
        engagementId: engagementId ?? null,
      },
    });
    await saveCapturedObservations(tx, userId, observations, {
      ...audienceSnapshot(source ?? identity),
      observedAt: data.occurredAt,
      nicheId: source ? source.nicheId : niche?.id,
      nicheSnapshot: source ? source.nicheSnapshot : niche?.name,
      interactionId: source?.interactionId,
      interactionRevisionId: source?.id,
    });
    if (["PROPOSED", "SHARED"].includes(data.kind))
      await tx.offerRevision.update({
        where: { id: revision.id },
        data: { proposedAt: data.occurredAt },
      });
    return offerId;
  });
}
export async function addOfferResponse(
  userId: string,
  offerId: string,
  key: string,
  input: unknown,
) {
  const data = offerResponseSchema.parse(input);
  return captureOnce(userId, key, input, async (tx) => {
    const offer = await lockOffer(tx, userId, offerId);
    if (offer.mode !== "AUDIENCE_TEST")
      throw new BusinessError(
        "Record a proposal outcome for this specific recipient.",
      );
    const revision = await tx.offerRevision.findFirst({
      where: { id: data.offerRevisionId, userId, offerId },
    });
    if (!revision)
      throw new BusinessError("Choose the exact terms this recipient saw.");
    if (
      !(await tx.offerEvent.findFirst({
        where: {
          userId,
          offerId,
          offerRevisionId: revision.id,
          engagementId: null,
          kind: "SHARED",
          retractedAt: null,
          occurredAt: { lte: data.occurredAt },
        },
      }))
    )
      throw new BusinessError(
        "Record when these terms were shared before saving a response.",
      );
    const audience = targetAudience(await captureAudience(tx, userId, data));
    if (audience.identityKind === "GROUP")
      throw new BusinessError(
        "Keep aggregate results as evidence, not individual responses.",
      );
    if (!audience.personId && !audience.companyId && !audience.audienceLabel)
      throw new BusinessError(
        "Identify the recipient or describe this anonymous response.",
      );
    if (
      (audience.personId || audience.companyId) &&
      offer.engagements.some(
        (e) =>
          e.personId === audience.personId &&
          e.companyId === audience.companyId,
      )
    )
      throw new BusinessError(
        "This recipient already has a response journal. Add their next outcome there.",
      );
    const source = await responseSource(
      tx,
      userId,
      audience,
      data.interactionId,
      data.interactionRevisionId,
    );
    if (
      source?.nicheId &&
      offer.niches.length &&
      !offer.niches.some((n) => n.nicheId === source.nicheId)
    )
      throw new BusinessError("Choose a source from this offer’s exploration.");
    const engagement = await tx.offerEngagement.create({
      data: { userId, offerId, ...audience },
    });
    await tx.offerEvent.create({
      data: {
        userId,
        offerId,
        offerRevisionId: revision.id,
        engagementId: engagement.id,
        kind: data.kind,
        occurredAt: data.occurredAt,
        sourceDescription: data.sourceDescription,
        interactionId: source?.interactionId,
        interactionRevisionId: source?.id,
      },
    });
    return engagement.id;
  });
}
export async function retractOfferEvent(
  userId: string,
  id: string,
  reason: string,
) {
  if (!reason.trim())
    throw new BusinessError("Explain the outcome correction.");
  return prisma.$transaction(async (tx) => {
    const initial = await tx.offerEvent.findFirst({ where: { id, userId } });
    if (!initial) throw new BusinessError("Choose an outcome you own.");
    await lockOffer(tx, userId, initial.offerId);
    await tx.offerEvent.update({
      where: { id_userId: { id, userId } },
      data: {
        retractedAt: new Date(),
        retractionReason: reason.trim().slice(0, 2000),
      },
    });
    return { id };
  });
}
export async function chooseOfferContinuation(
  userId: string,
  offerId: string,
  key: string,
  input: {
    choice: string;
    workSourceId?: string;
    name?: string;
    engagementId?: string;
  },
) {
  if (!["LINKED", "NOT_NOW", "NOT_NEEDED"].includes(input.choice))
    throw new BusinessError("Choose how you want to continue.");
  return captureOnce(userId, key, input, async (tx) => {
    const offer = await lockOffer(tx, userId, offerId);
    const engagement =
      offer.mode === "SPECIFIC"
        ? offer.engagements[0]
        : offer.engagements.find((e) => e.id === input.engagementId);
    if (
      !engagement ||
      !(await tx.offerEvent.findFirst({
        where: {
          userId,
          offerId,
          engagementId: engagement.id,
          kind: "ACCEPTED",
          retractedAt: null,
        },
      }))
    )
      throw new BusinessError(
        "Record acceptance before choosing the work continuation.",
      );
    let workSourceId: string | null = null;
    if (input.choice === "LINKED") {
      if (engagement.companyId)
        workSourceId = await connectCompanyWorkSource(
          tx,
          userId,
          engagement.companyId,
          input,
        );
      else {
        const source = input.workSourceId
          ? await tx.workSource.findFirst({
              where: { id: input.workSourceId, userId, archivedAt: null },
            })
          : input.name?.trim()
            ? await tx.workSource.create({
                data: {
                  userId,
                  name: input.name.trim().slice(0, 120),
                  type: "CLIENT",
                  defaultCompensationType: "UNKNOWN",
                },
              })
            : null;
        if (!source)
          throw new BusinessError(
            "Choose an existing WorkSource or name one to create.",
          );
        workSourceId = source.id;
      }
    }
    await tx.offerEngagement.update({
      where: { id: engagement.id },
      data: { continuationChoice: input.choice, workSourceId },
    });
    if (offer.mode === "SPECIFIC")
      await tx.offer.update({
        where: { id: offer.id },
        data: { continuationChoice: input.choice },
      });
    return offerId;
  });
}
