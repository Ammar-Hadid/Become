"use server";
import { interactionForm } from "@/features/entrepreneurship/interactions/utils/interaction-form.util";
import { normalizeReusableEntityName } from "@/lib/validation/utils/canonical-name.util";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { businessMutation } from "@/features/entrepreneurship/shared/services/business-mutation.service";
import {
  logInteraction,
  logBatchOutreach,
  correctInteraction,
  voidInteraction,
} from "@/features/entrepreneurship/interactions/services/interaction.service";
export async function logInteractionAction(form: FormData) {
  return businessMutation((userId) =>
    logInteraction(
      userId,
      String(form.get("captureKey")),
      interactionForm(form),
    ),
  );
}
export async function correctInteractionAction(
  id: string,
  version: number,
  form: FormData,
) {
  return businessMutation((userId) =>
    correctInteraction(userId, id, String(form.get("captureKey")), {
      ...interactionForm(form),
      expectedVersion: version,
      audienceScopeEdited: form.get("audienceScopeEdited") === "true",
      meaningUnchanged: form.get("meaningUnchanged") === "on",
    }),
  );
}
export async function batchOutreachAction(form: FormData) {
  return businessMutation((userId) =>
    logBatchOutreach(userId, String(form.get("captureKey")), {
      ...Object.fromEntries(form),
      companyIds: form.getAll("companyIds"),
      personIds: form.getAll("personIds"),
      segmentIds: form.getAll("segmentIds"),
      segmentNames: form.getAll("segmentNames").map(String),
      overrides: JSON.parse(String(form.get("overrides") ?? "{}")),
      confirmedSent: form.get("confirmedSent") === "on",
    }),
  );
}
export async function voidInteractionAction(id: string, form: FormData) {
  return businessMutation((userId) =>
    voidInteraction(userId, id, String(form.get("reason") ?? "")),
  );
}
export async function searchCompaniesAction(query: string, archived = false) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.company.findMany({
    where: {
      userId: user.id,
      archivedAt: archived ? { not: null } : null,
      normalizedName: {
        contains: normalizeReusableEntityName(query).slice(0, 120),
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 30,
  });
}
