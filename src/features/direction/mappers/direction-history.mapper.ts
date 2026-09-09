import type { DirectionChangeView } from "@/features/direction/types/direction.types";
import { METRIC_CATALOG } from "@/features/direction/measurements/constants/metric-catalog.constants";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
const scopeLabels: Record<string, string> = {
  workSourceId: "Work source",
  companyId: "Company",
  nicheId: "Exploration",
  projectId: "Project",
  savingsGoalId: "Savings goal",
  domainId: "Domain",
  activityTypeId: "Activity",
  offerRevisionId: "Offer revision",
};

/** Render captured facts, never re-resolve historical names against live records. */
export function directionChangeView(row: {
  id: string;
  kind: string;
  reason: string;
  createdAt: Date;
  snapshot: unknown;
}): DirectionChangeView {
  const snapshot = record(row.snapshot),
    draft = record(snapshot.draft ?? snapshot);
  const details: string[] = [];
  for (const [key, label] of [
    ["title", "Intention"],
    ["description", "Context"],
    ["question", "Question"],
    ["approach", "Approach"],
    ["stoppingCondition", "Stopping condition"],
    ["expectedEvidence", "Expected evidence"],
  ])
    if (text(draft[key])) details.push(`${label}: ${text(draft[key])}`);
  if (text(draft.startOn))
    details.push(
      `Horizon: ${text(draft.startOn)} → ${text(draft.targetOn) || "Open-ended"}`,
    );
  if (list(draft.criteria).length)
    details.push(
      draft.criterionMode === "ANY"
        ? "Any criterion is sufficient."
        : "All criteria are required.",
    );
  const scopes = record(snapshot.criterionScopes);
  for (const item of list(draft.criteria)) {
    const c = record(item),
      captured = record(scopes[text(c.key)]);
    const metric = METRIC_CATALOG.find((m) => m.key === c.metric);
    const parts = [text(c.label) || metric?.name || text(c.metric)];
    if (text(c.target))
      parts.push(
        `Target ${text(c.target)}${text(c.currency) ? ` ${text(c.currency)}` : metric ? ` ${metric.unit}` : ""}`,
      );
    for (const [field, label] of Object.entries(scopeLabels)) {
      if (!text(c[field])) continue;
      const value = record(captured[field]);
      parts.push(
        `${label}: ${text(value.name) || `record ${text(c[field])}`}${text(value.description) ? ` (${text(value.description)})` : ""}`,
      );
    }
    if (c.startOn || c.endOn)
      parts.push(
        `Measurement dates: ${text(c.startOn) || text(draft.startOn)} → ${text(c.endOn) || text(draft.targetOn) || "Open-ended"}`,
      );
    if (text(c.evidenceType))
      parts.push(`Evidence kind: ${text(c.evidenceType)}`);
    if (text(c.minimumReceived))
      parts.push(
        `Minimum received: ${text(c.minimumReceived)} ${text(c.currency)}`,
      );
    if (c.selectedOutreachOnly === true)
      parts.push(
        "Only conversations explicitly linked to this trial's selected outreach.",
      );
    for (const assertion of list(c.baselineAssertions)) {
      const a = record(assertion);
      parts.push(
        `Baseline for company ${text(a.companyId)}: ${a.noPriorPaidRelationship === true ? "No prior paid relationship asserted" : "Prior relationship or unknown"}${text(a.note) ? ` — ${text(a.note)}` : ""}`,
      );
    }
    details.push(parts.filter(Boolean).join(" · "));
  }
  const command = record(snapshot.command);
  if (text(command.outcome))
    details.push(
      `Conclusion: ${text(command.outcome).replaceAll("_", " ").toLowerCase()}`,
    );
  if (text(command.result)) details.push(`Result: ${text(command.result)}`);
  if (text(command.learning))
    details.push(`Learning: ${text(command.learning)}`);
  const evaluation = record(snapshot.evaluation);
  for (const criterion of list(evaluation.criteria)) {
    const c = record(criterion);
    details.push(
      `${text(c.label)}: ${text(c.valueLabel)}${text(c.targetLabel) ? ` · ${text(c.targetLabel)}` : ""} · ${text(c.availability).replaceAll("_", " ").toLowerCase()}`,
    );
  }
  if (text(snapshot.assessedOn)) {
    details.push(
      `Assessment on ${text(snapshot.assessedOn)}: ${snapshot.confirmed === true ? "Confirmed" : "Not yet established"}`,
    );
    for (const source of list(snapshot.sources)) {
      const item = record(record(source).item);
      if (text(item.label))
        details.push(
          `Evidence: ${text(item.label)}${text(item.occurredAt) ? ` · ${text(item.occurredAt)}` : ""}`,
        );
    }
  }
  return {
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    snapshot: row.snapshot,
    details,
  };
}
