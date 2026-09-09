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
} from "@/features/entrepreneurship/offers/schemas/offer.schema";
import { quoteMoney } from "@/features/entrepreneurship/offers/utils/offer.util";

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
  } catch (error) {
    throw new BusinessError((error as Error).message);
  }
  if (
    data.priceBasis === "RECURRING" &&
    (!data.intervalUnit || !data.intervalCount)
  )
    throw new BusinessError("Choose the recurring quote interval.");
  if (data.priceBasis === "PER_UNIT" && !data.unitLabel)
    throw new BusinessError("Name the quoted unit.");
  return captureOnce(userId, key, input, async (tx) => {
    const company = await tx.company.findFirst({
      where: { id: data.companyId, userId, archivedAt: null },
    });
    if (!company) throw new BusinessError("Choose an active company you own.");
    if (offerId)
      await tx.$queryRaw`SELECT id FROM offer WHERE id=${offerId} AND "userId"=${userId} FOR UPDATE`;
    const offer = offerId
      ? await tx.offer.findFirst({
          where: { id: offerId, userId, archivedAt: null },
        })
      : await tx.offer.create({ data: { userId, companyId: company.id } });
    if (!offer || offer.companyId !== company.id)
      throw new BusinessError(
        "A revision must belong to this offer and its company.",
      );
    if (!offerId && data.nicheId) {
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
    const problemIds = [...new Set(data.problemIds)];
    if (
      (await tx.problem.count({
        where: { id: { in: problemIds }, userId, archivedAt: null },
      })) !== problemIds.length
    )
      throw new BusinessError("Choose active problems you own.");
    const latest = await tx.offerRevision.findFirst({
      where: { offerId: offer.id, userId },
      orderBy: { version: "desc" },
    });
    const revision = await tx.offerRevision.create({
      data: {
        userId,
        offerId: offer.id,
        companyId: company.id,
        companySnapshot: company.name,
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
      data: problemIds.map((problemId) => ({
        userId,
        offerId: offer.id,
        offerRevisionId: revision.id,
        problemId,
      })),
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
    await tx.$queryRaw`SELECT id FROM offer WHERE id=${offerId} AND "userId"=${userId} FOR UPDATE`;
    const revision = await tx.offerRevision.findFirst({
      where: { id: data.offerRevisionId, offerId, userId },
      include: {
        events: {
          where: { retractedAt: null },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });
    if (!revision) throw new BusinessError("Choose a revision of this offer.");
    const current = revision.events[0];
    if (current && data.occurredAt < current.occurredAt)
      throw new BusinessError(
        "This date precedes the latest outcome. Correct that outcome first so the sequence remains clear.",
      );
    if (data.kind === "PROPOSED" && revision.proposedAt)
      throw new BusinessError(
        "This revision was already proposed. Create a new revision for different terms.",
      );
    if (
      data.kind !== "PROPOSED" &&
      !revision.events.some((event) => event.kind === "PROPOSED")
    )
      throw new BusinessError("Record the actual proposal before its outcome.");
    if (current?.kind === data.kind)
      throw new BusinessError(
        "That outcome is already recorded for this revision.",
      );
    if (
      data.kind === "EXPIRED" &&
      (!revision.expiresOn ||
        DateTime.fromJSDate(data.occurredAt, {
          zone: APP_TIMEZONE,
        }).toISODate()! <
          DateTime.fromJSDate(revision.expiresOn, { zone: "UTC" }).toISODate()!)
    )
      throw new BusinessError("Expiry must follow the quoted expiry date.");
    let observationNiche = data.nicheId
      ? await tx.niche.findFirst({
          where: { id: data.nicheId, userId, archivedAt: null },
        })
      : null;
    if (data.nicheId && !observationNiche)
      throw new BusinessError("Choose an active exploration you own.");
    if (data.interactionId || data.interactionRevisionId) {
      const source = await tx.interactionRevision.findFirst({
        where: {
          id: data.interactionRevisionId ?? "",
          interactionId: data.interactionId ?? "",
          userId,
        },
        include: { interaction: true, niche: true },
      });
      if (
        !source ||
        source.interaction.voidedAt ||
        (source.companyId && source.companyId !== revision.companyId)
      )
        throw new BusinessError(
          "Choose a source interaction for this company.",
        );
      observationNiche = source.niche;
    }
    const { observations, nicheId, ...eventData } = data;
    if (nicheId && !observationNiche && !data.interactionId)
      throw new BusinessError("Choose an active exploration you own.");
    await tx.offerEvent.create({ data: { userId, offerId, ...eventData } });
    await saveCapturedObservations(tx, userId, observations, {
      nicheId: observationNiche?.id,
      nicheSnapshot: observationNiche?.name,
      observedAt: data.occurredAt,
      companyId: revision.companyId,
      companySnapshot: revision.companySnapshot,
      interactionId: data.interactionId,
      interactionRevisionId: data.interactionRevisionId,
    });
    if (data.kind === "PROPOSED")
      await tx.offerRevision.update({
        where: { id: revision.id },
        data: { proposedAt: data.occurredAt },
      });
    return offerId;
  });
}
export async function retractOfferEvent(
  userId: string,
  id: string,
  reason: string,
) {
  if (!reason.trim())
    throw new BusinessError("Explain the outcome correction.");
  return prisma.offerEvent.update({
    where: { id_userId: { id, userId } },
    data: {
      retractedAt: new Date(),
      retractionReason: reason.trim().slice(0, 2000),
    },
  });
}
export async function chooseOfferContinuation(
  userId: string,
  offerId: string,
  key: string,
  input: { choice: string; workSourceId?: string; name?: string },
) {
  if (!["LINKED", "NOT_NOW", "NOT_NEEDED"].includes(input.choice))
    throw new BusinessError("Choose how you want to continue.");
  return captureOnce(userId, key, input, async (tx) => {
    const offer = await tx.offer.findFirst({
      where: { id: offerId, userId },
      include: { events: { where: { kind: "ACCEPTED", retractedAt: null } } },
    });
    if (!offer || !offer.events.length)
      throw new BusinessError(
        "Record acceptance before choosing the work continuation.",
      );
    if (input.choice === "LINKED") {
      await connectCompanyWorkSource(tx, userId, offer.companyId, input);
    }
    await tx.offer.update({
      where: { id: offer.id },
      data: { continuationChoice: input.choice },
    });
    return offer.id;
  });
}
