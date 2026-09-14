import { captureDirectionSources } from "@/features/entrepreneurship/explorations/services/exploration-direction.service";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { canonicalName } from "@/features/entrepreneurship/shared/utils/business.util";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import {
  directionSchema,
  marketSchema,
  nameSchema,
} from "@/features/entrepreneurship/market/schemas/market.schema";

export async function resolveCompany(
  tx: Prisma.TransactionClient,
  userId: string,
  id?: string | null,
  name?: string | null,
) {
  if (!id && !name?.trim()) return null;
  if (id) {
    const company = await tx.company.findFirst({
      where: { id, userId, archivedAt: null },
    });
    if (!company) throw new BusinessError("Choose an active company you own.");
    return company;
  }
  const clean = nameSchema.parse(name);
  const company = await tx.company.upsert({
    where: {
      userId_normalizedName: { userId, normalizedName: canonicalName(clean) },
    },
    update: {},
    create: { userId, name: clean, normalizedName: canonicalName(clean) },
  });
  if (company.archivedAt)
    throw new BusinessError(
      "This company is archived. Restore it from Market before using it again.",
    );
  return company;
}

export async function saveMarketRecord(
  userId: string,
  kind: "company" | "niche",
  input: unknown,
  id?: string,
) {
  const data = marketSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    if (id) {
      if (kind === "company")
        await tx.$queryRaw`SELECT id FROM company WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      else
        await tx.$queryRaw`SELECT id FROM niche WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
      const prior =
        kind === "company"
          ? await tx.company.findFirst({ where: { id, userId } })
          : await tx.niche.findFirst({ where: { id, userId } });
      if (
        !prior ||
        !data.expectedUpdatedAt ||
        prior.updatedAt.getTime() !== new Date(data.expectedUpdatedAt).getTime()
      )
        throw new BusinessError(
          "These details changed since you opened the form. Your edits are preserved; review the latest record before saving.",
        );
    }
    const normalizedName = canonicalName(data.name);
    if (kind === "niche") {
      const values = { name: data.name, normalizedName, scope: data.scope };
      if (id)
        return tx.niche.update({
          where: { id_userId: { id, userId } },
          data: values,
        });
      const found = await tx.niche.findUnique({
        where: { userId_normalizedName: { userId, normalizedName } },
      });
      if (found)
        throw new BusinessError(
          found.archivedAt
            ? "This niche is archived. Restore it from Market."
            : "That niche already exists. Open it from Market.",
        );
      return tx.niche.create({
        data: {
          ...values,
          userId,
          marketFocus: data.marketFocus ?? "UNKNOWN",
          marketConclusion: "UNDECIDED",
          decisions: {
            create: {
              direction: "EXPLORING",
              marketFocus: data.marketFocus ?? "UNKNOWN",
              marketConclusion: "UNDECIDED",
              rationale: "Started exploring this market.",
              scopeSnapshot: data.scope,
            },
          },
        },
      });
    }
    const values = {
      name: data.name,
      normalizedName,
      website: data.website,
      notes: data.notes,
    };
    if (!id) {
      const found = await tx.company.findUnique({
        where: { userId_normalizedName: { userId, normalizedName } },
      });
      if (found)
        throw new BusinessError(
          found.archivedAt
            ? "This company is archived. Restore it from Market."
            : "That company already exists. Open it from Market.",
        );
    }
    const count = await tx.niche.count({
      where: {
        id: { in: [...new Set(data.nicheIds)] },
        userId,
        archivedAt: null,
      },
    });
    if (count !== new Set(data.nicheIds).size)
      throw new BusinessError("Choose active niches you own.");
    const record = id
      ? await tx.company.update({
          where: { id_userId: { id, userId } },
          data: values,
        })
      : await tx.company.create({ data: { ...values, userId } });
    await tx.companyNiche.deleteMany({
      where: { companyId: record.id, userId },
    });
    await tx.companyNiche.createMany({
      data: [...new Set(data.nicheIds)].map((nicheId) => ({
        companyId: record.id,
        nicheId,
        userId,
      })),
    });
    return record;
  });
}

export async function changeNicheDirection(
  userId: string,
  nicheId: string,
  input: unknown,
) {
  const data = directionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM niche WHERE id=${nicheId} AND "userId"=${userId} FOR UPDATE`;
    const prior = await tx.niche.findFirst({
      where: { id: nicheId, userId, archivedAt: null },
    });
    if (!prior)
      throw new BusinessError(
        "Restore this exploration before changing its direction.",
      );
    if (
      data.expectedUpdatedAt &&
      prior.updatedAt.toISOString() !== data.expectedUpdatedAt
    )
      throw new BusinessError(
        "This exploration changed. Review its latest direction before saving.",
      );
    const niche = await tx.niche.update({
      where: { id_userId: { id: nicheId, userId } },
      data: {
        direction: data.direction,
        marketFocus: data.marketFocus ?? prior.marketFocus,
        marketConclusion: data.marketConclusion ?? prior.marketConclusion,
      },
    });
    const sourceSnapshots = await captureDirectionSources(
      tx,
      userId,
      nicheId,
      data.sourceKeys,
    );
    await tx.nicheDecision.create({
      data: {
        userId,
        nicheId,
        direction: data.direction,
        rationale: data.rationale,
        scopeSnapshot: niche.scope,
        marketFocus: niche.marketFocus,
        marketConclusion: niche.marketConclusion,
        conclusionScope: data.conclusionScope,
        sourceSnapshots,
      },
    });
    return niche;
  });
}

export async function archiveMarketRecord(
  userId: string,
  kind: "company" | "niche",
  id: string,
  restore: boolean,
) {
  const args = {
    where: { id_userId: { id, userId } },
    data: { archivedAt: restore ? null : new Date() },
  };
  return kind === "company"
    ? prisma.company.update(args)
    : prisma.niche.update(args);
}

export async function addCompanyToExploration(
  userId: string,
  nicheId: string,
  companyId: string,
) {
  return prisma.$transaction(async (tx) => {
    const [company, niche] = await Promise.all([
      tx.company.findFirst({
        where: { id: companyId, userId, archivedAt: null },
      }),
      tx.niche.findFirst({ where: { id: nicheId, userId, archivedAt: null } }),
    ]);
    if (!company || !niche)
      throw new BusinessError(
        "Choose an active company and exploration you own.",
      );
    await tx.companyNiche.upsert({
      where: { companyId_nicheId: { companyId, nicheId } },
      create: { userId, companyId, nicheId },
      update: {},
    });
    return company;
  });
}
