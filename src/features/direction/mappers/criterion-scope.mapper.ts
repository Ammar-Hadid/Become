import type { Prisma } from "@/generated/prisma/client";
import type { CriterionScopes } from "@/features/direction/types/direction.types";
const named = { select: { id: true, name: true, archivedAt: true } } as const;
export const criterionRelations = {
  workSource: named,
  company: named,
  niche: named,
  project: named,
  savingsGoal: named,
  domain: { select: { id: true, name: true, enabled: true } },
  activityType: { select: { id: true, name: true, enabled: true } },
  offerRevision: {
    select: { id: true, title: true, companySnapshot: true, version: true },
  },
} as const;
export function criterionScopes(
  rows: Prisma.DirectionCriterionGetPayload<{
    include: typeof criterionRelations;
  }>[],
): CriterionScopes {
  return Object.fromEntries(
    rows.map((row) => {
      const map: CriterionScopes[string] = {};
      for (const [relation, field] of [
        ["workSource", "workSourceId"],
        ["company", "companyId"],
        ["niche", "nicheId"],
        ["project", "projectId"],
        ["savingsGoal", "savingsGoalId"],
        ["domain", "domainId"],
        ["activityType", "activityTypeId"],
      ] as const) {
        const value = row[relation];
        if (value)
          map[field] = {
            id: value.id,
            name: value.name,
            archived:
              "archivedAt" in value
                ? Boolean(value.archivedAt)
                : !value.enabled,
          };
      }
      if (row.offerRevision)
        map.offerRevisionId = {
          id: row.offerRevision.id,
          name: `${row.offerRevision.companySnapshot} · ${row.offerRevision.title}`,
          description: `Revision ${row.offerRevision.version}`,
        };
      return [row.key, map];
    }),
  );
}
