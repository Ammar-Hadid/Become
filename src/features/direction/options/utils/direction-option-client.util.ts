import type {
  OwnedOption,
  PageResult,
} from "@/features/direction/types/direction.types";

export type DirectionOptionKind =
  | "content"
  | "channel"
  | "publication"
  | "contentObservation"
  | "decision"
  | "goal"
  | "experiment"
  | "season"
  | "domain"
  | "company"
  | "niche"
  | "project"
  | "workSource"
  | "activity"
  | "savingsGoal"
  | "interaction"
  | "offerRevision"
  | "session"
  | "engineeringEvidence"
  | "transaction"
  | "outreach"
  | "concludedExperiment";

export async function searchDirectionOptions(
  kind: DirectionOptionKind,
  search: string,
  scope: { companyId?: string; domainId?: string } = {},
): Promise<OwnedOption[]> {
  const params = new URLSearchParams({ kind });
  if (search.trim()) params.set("search", search.trim());
  if (scope.companyId) params.set("companyId", scope.companyId);
  if (scope.domainId) params.set("domainId", scope.domainId);
  const response = await fetch(`/api/direction/options?${params}`);
  if (!response.ok) throw new Error("Direction options could not be loaded.");
  const result = (await response.json()) as PageResult<OwnedOption>;
  return result.items;
}
