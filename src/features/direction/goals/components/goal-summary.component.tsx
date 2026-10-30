import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { GoalView } from "@/features/direction/types/direction.types";

function lifecycleLabel(goal: GoalView) {
  if (goal.archivedAt) return "Archived";
  if (goal.status === "PAUSED") return "Paused";
  if (goal.status === "CONCLUDED") {
    return goal.outcome
      ? goal.outcome.replaceAll("_", " ").toLowerCase()
      : "Concluded";
  }
  return "Active";
}

export function GoalSummary({ goal }: { goal: GoalView }) {
  return (
    <Link className="direction-goal-row" href={`/direction/goals/${goal.id}`}>
      <div className="direction-goal-main">
        <div className="direction-goal-title-row">
          <h3>{goal.title}</h3>
          <span className="direction-goal-badges">
            <span className="direction-goal-lifecycle">
              {lifecycleLabel(goal)}
            </span>
          </span>
        </div>
        <p>{goal.description || ""}</p>
        <span className="simple-goal-domains">
          {goal.domains.map((domain) => (
            <span key={domain.id}>{domain.name}</span>
          ))}
        </span>
        <span className="direction-goal-horizon">
          {goal.targetOn
            ? `${goal.startOn} — ${goal.targetOn}`
            : `Since ${goal.startOn} · open ended`}
        </span>
      </div>
      <ArrowUpRight className="direction-goal-arrow" aria-hidden="true" />
    </Link>
  );
}
