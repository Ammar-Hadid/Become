import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";
import { BUSINESS_ACTIVITY_KINDS } from "@/features/entrepreneurship/sessions/constants/business-activity.constants";
export async function businessSessionValues(
  userId: string,
  isBusiness: boolean,
  activitySlug: string,
  input: { businessCompanyId?: string | null; businessNicheId?: string | null },
  tx: Prisma.TransactionClient = prisma,
) {
  if (!isBusiness) {
    if (input.businessCompanyId || input.businessNicheId)
      throw new BusinessError(
        "Company and niche context require Entrepreneurship.",
      );
    return {};
  }
  const company = input.businessCompanyId
    ? await tx.company.findFirst({
        where: { id: input.businessCompanyId, userId, archivedAt: null },
      })
    : null;
  const niche = input.businessNicheId
    ? await tx.niche.findFirst({
        where: { id: input.businessNicheId, userId, archivedAt: null },
      })
    : null;
  if (input.businessCompanyId && !company)
    throw new BusinessError("Choose an active company you own.");
  if (input.businessNicheId && !niche)
    throw new BusinessError("Choose an active niche you own.");
  return {
    businessCompanyId: company?.id ?? null,
    businessCompanySnapshot: company?.name ?? null,
    businessNicheId: niche?.id ?? null,
    businessNicheSnapshot: niche?.name ?? null,
    entrepreneurshipActivityKind:
      BUSINESS_ACTIVITY_KINDS[activitySlug] ?? "UNKNOWN",
  };
}
