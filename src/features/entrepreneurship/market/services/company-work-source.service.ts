import type { Prisma } from "@/generated/prisma/client";
import { captureOnce } from "@/features/entrepreneurship/shared/services/capture.service";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";

export async function connectCompanyWorkSource(
  tx: Prisma.TransactionClient,
  userId: string,
  companyId: string,
  input: { workSourceId?: string; name?: string },
) {
  const company = await tx.company.findFirst({
    where: { id: companyId, userId, archivedAt: null },
  });
  if (!company) throw new BusinessError("Choose an active company you own.");
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
  await tx.companyWorkSource.upsert({
    where: { companyId_workSourceId: { companyId, workSourceId: source.id } },
    update: {},
    create: { userId, companyId, workSourceId: source.id },
  });
  return source.id;
}
export function linkCompanyWorkSource(
  userId: string,
  companyId: string,
  key: string,
  input: { workSourceId?: string; name?: string },
) {
  return captureOnce(userId, key, { companyId, ...input }, async (tx) => {
    await connectCompanyWorkSource(tx, userId, companyId, input);
    return companyId;
  });
}
