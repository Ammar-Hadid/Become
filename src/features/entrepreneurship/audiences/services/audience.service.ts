import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { canonicalName } from "@/features/entrepreneurship/shared/utils/business.util";
import { resolveCompany } from "@/features/entrepreneurship/market/services/market.service";
import {
  audienceContextSchema,
  audienceInputSchema,
  audienceRecordSchema,
} from "@/features/entrepreneurship/audiences/schemas/audience.schema";

export async function captureAudienceContext(
  tx: Prisma.TransactionClient,
  userId: string,
  input: unknown,
) {
  const data = audienceContextSchema.parse(input);
  const ids = [...new Set(data.segmentIds)].sort();
  const names = [
    ...new Map(
      data.segmentNames.map((name) => [canonicalName(name), name]),
    ).values(),
  ];
  if (ids.length + names.length > 30)
    throw new BusinessError("Choose up to 30 audience segments.");
  const segments = await tx.audienceSegment.findMany({
    where: { userId, id: { in: ids }, archivedAt: null },
  });
  if (segments.length !== ids.length)
    throw new BusinessError("Choose available audience segments you own.");
  for (const name of names)
    segments.push(
      await tx.audienceSegment.create({
        data: {
          userId,
          name,
          normalizedName: canonicalName(name),
          marketType: data.marketType,
        },
      }),
    );
  return tx.audienceContext.create({
    data: {
      userId,
      marketType: data.marketType,
      description: data.audienceDescription,
      segments: {
        create: segments.map((s) => ({
          segmentId: s.id,
          nameSnapshot: s.name,
          descriptionSnapshot: s.description,
        })),
      },
    },
    include: { segments: true },
  });
}
export async function captureAudience(
  tx: Prisma.TransactionClient,
  userId: string,
  input: unknown,
  nicheId?: string | null,
  preservedContext?: Prisma.AudienceContextGetPayload<{
    include: { segments: true };
  }> | null,
) {
  const data = audienceInputSchema.parse(input);
  let identityKind = data.identityKind;
  if (identityKind === "UNSPECIFIED")
    identityKind =
      data.personId || data.personName
        ? "PERSON"
        : data.companyId || data.companyName
          ? "BUSINESS"
          : "UNSPECIFIED";
  if (
    ["ANONYMOUS", "GROUP"].includes(identityKind) &&
    (data.personId || data.personName || data.companyId || data.companyName)
  )
    throw new BusinessError(
      "Unnamed sources cannot also identify a person or business.",
    );
  if (data.sampleSize != null && identityKind !== "GROUP")
    throw new BusinessError(
      "A reported sample size belongs to a group source.",
    );
  if (
    identityKind === "GROUP" &&
    !data.audienceLabel &&
    !data.audienceDescription
  )
    throw new BusinessError("Describe the group or aggregate source.");
  const company = await resolveCompany(
    tx,
    userId,
    data.companyId,
    data.companyName,
  );
  let person = data.personId
    ? await tx.person.findFirst({
        where: { id: data.personId, userId, archivedAt: null },
      })
    : null;
  if (data.personId && !person)
    throw new BusinessError("Choose an available person you own.");
  if (!person && data.personName)
    person = await tx.person.create({
      data: {
        userId,
        name: data.personName,
        normalizedName: canonicalName(data.personName),
      },
    });
  if (identityKind === "PERSON" && !person)
    throw new BusinessError("Name the person, or choose an unnamed source.");
  if (identityKind === "BUSINESS" && !company)
    throw new BusinessError("Name the business, or choose an unnamed source.");
  const context =
    preservedContext === undefined
      ? await captureAudienceContext(tx, userId, data)
      : preservedContext;
  if (context && context.userId !== userId)
    throw new BusinessError("Choose a context you own.");
  if (nicheId) {
    if (
      !(await tx.niche.findFirst({
        where: { id: nicheId, userId, archivedAt: null },
      }))
    )
      throw new BusinessError("Choose an available exploration you own.");
    if (person)
      await tx.personNiche.upsert({
        where: { personId_nicheId: { personId: person.id, nicheId } },
        create: { userId, personId: person.id, nicheId },
        update: {},
      });
    if (context?.segments.length)
      await tx.audienceSegmentNiche.createMany({
        data: context.segments.map((s) => ({
          userId,
          segmentId: s.segmentId,
          nicheId,
        })),
        skipDuplicates: true,
      });
  }
  return {
    audienceContextId: context?.id ?? null,
    identityKind,
    personId: person?.id ?? null,
    personSnapshot: person?.name ?? null,
    companyId: company?.id ?? null,
    companySnapshot: company?.name ?? null,
    audienceLabel: data.audienceLabel,
    sampleSize: data.sampleSize ?? null,
    sampleUnit:
      data.sampleSize != null ? data.sampleUnit || "respondents" : null,
  };
}
export function audienceSnapshot(source: {
  audienceContextId: string | null;
  identityKind: string;
  personId: string | null;
  personSnapshot: string | null;
  companyId: string | null;
  companySnapshot: string | null;
  audienceLabel: string | null;
  sampleSize?: number | null;
  sampleUnit?: string | null;
}) {
  return {
    audienceContextId: source.audienceContextId,
    identityKind: source.identityKind,
    personId: source.personId,
    personSnapshot: source.personSnapshot,
    companyId: source.companyId,
    companySnapshot: source.companySnapshot,
    audienceLabel: source.audienceLabel,
    sampleSize: source.sampleSize ?? null,
    sampleUnit: source.sampleUnit ?? null,
  };
}
export function targetAudience(source: ReturnType<typeof audienceSnapshot>) {
  const { sampleSize, sampleUnit, ...target } = source;
  void sampleSize;
  void sampleUnit;
  return target;
}
export async function saveAudienceRecord(
  userId: string,
  kind: "person" | "segment",
  id: string | null,
  key: string,
  input: unknown,
) {
  const data = audienceRecordSchema.parse(input);
  return captureOnce(userId, key, { kind, id, input }, async (tx) => {
    if (id) {
      const rows =
        kind === "person"
          ? await tx.$queryRaw<
              { id: string }[]
            >`SELECT id FROM market_person WHERE id=${id} AND "userId"=${userId} FOR UPDATE`
          : await tx.$queryRaw<
              { id: string }[]
            >`SELECT id FROM audience_segment WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const prior =
        kind === "person"
          ? await tx.person.findFirst({ where: { id, userId } })
          : await tx.audienceSegment.findFirst({ where: { id, userId } });
      if (
        !rows.length ||
        !prior ||
        prior.updatedAt.toISOString() !== data.expectedUpdatedAt
      )
        throw new BusinessError(
          "These details changed. Review the latest record before saving.",
        );
    }
    const base = { name: data.name, normalizedName: canonicalName(data.name) };
    const record =
      kind === "person"
        ? id
          ? await tx.person.update({
              where: { id_userId: { id, userId } },
              data: { ...base, email: data.email, notes: data.notes },
            })
          : await tx.person.create({
              data: { ...base, userId, email: data.email, notes: data.notes },
            })
        : id
          ? await tx.audienceSegment.update({
              where: { id_userId: { id, userId } },
              data: {
                ...base,
                description: data.description,
                marketType: data.marketType,
              },
            })
          : await tx.audienceSegment.create({
              data: {
                ...base,
                userId,
                description: data.description,
                marketType: data.marketType,
              },
            });
    if (data.nicheId)
      await attachAudience(tx, userId, kind, record.id, data.nicheId);
    return record.id;
  });
}
export async function attachAudience(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: "person" | "segment",
  id: string,
  nicheId: string,
) {
  const record =
    kind === "person"
      ? await tx.person.findFirst({ where: { id, userId, archivedAt: null } })
      : await tx.audienceSegment.findFirst({
          where: { id, userId, archivedAt: null },
        });
  if (
    !record ||
    !(await tx.niche.findFirst({
      where: { id: nicheId, userId, archivedAt: null },
    }))
  )
    throw new BusinessError(
      "Choose an available audience and exploration you own.",
    );
  if (kind === "person")
    await tx.personNiche.upsert({
      where: { personId_nicheId: { personId: id, nicheId } },
      create: { userId, personId: id, nicheId },
      update: {},
    });
  else
    await tx.audienceSegmentNiche.upsert({
      where: { segmentId_nicheId: { segmentId: id, nicheId } },
      create: { userId, segmentId: id, nicheId },
      update: {},
    });
  return { id };
}
export async function addAudienceToExploration(
  userId: string,
  kind: "person" | "segment",
  id: string,
  nicheId: string,
) {
  return prisma.$transaction((tx) =>
    attachAudience(tx, userId, kind, id, nicheId),
  );
}
export function archiveAudienceRecord(
  userId: string,
  kind: "person" | "segment",
  id: string,
  restore: boolean,
) {
  const args = {
    where: { id_userId: { id, userId } },
    data: { archivedAt: restore ? null : new Date() },
  };
  return kind === "person"
    ? prisma.person.update(args)
    : prisma.audienceSegment.update(args);
}
