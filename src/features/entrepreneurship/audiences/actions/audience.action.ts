"use server";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import { canonicalName } from "@/features/entrepreneurship/shared/utils/business.util";
import {
  saveAudienceRecord,
  addAudienceToExploration,
  archiveAudienceRecord,
} from "@/features/entrepreneurship/audiences/services/audience.service";
export async function searchPeopleAction(query: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.person.findMany({
    where: {
      userId: user.id,
      archivedAt: null,
      normalizedName: { contains: canonicalName(query).slice(0, 120) },
    },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 30,
  });
}
export async function searchSegmentsAction(query: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.audienceSegment.findMany({
    where: {
      userId: user.id,
      archivedAt: null,
      normalizedName: { contains: canonicalName(query).slice(0, 120) },
    },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 30,
  });
}
export async function saveAudienceAction(
  kind: "person" | "segment",
  id: string | null,
  form: FormData,
) {
  return businessMutation((userId) =>
    saveAudienceRecord(
      userId,
      kind,
      id,
      String(form.get("captureKey")),
      Object.fromEntries(form),
    ),
  );
}
export async function addAudienceToExplorationAction(
  kind: "person" | "segment",
  nicheId: string,
  form: FormData,
) {
  return businessMutation((userId) =>
    addAudienceToExploration(
      userId,
      kind,
      String(
        form.get(kind === "person" ? "personId" : "segmentId") ??
          form.get("id") ??
          "",
      ),
      nicheId,
    ),
  );
}
export async function archiveAudienceAction(
  kind: "person" | "segment",
  id: string,
  restore: boolean,
) {
  return businessMutation((userId) =>
    archiveAudienceRecord(userId, kind, id, restore),
  );
}
