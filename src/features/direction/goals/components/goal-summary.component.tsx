import Link from "next/link";
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
} from "lucide-react";
import type { GoalView } from "@/features/direction/types/direction.types";

function evaluationState(goal: GoalView) {
  if (goal.liveChangedSinceConclusion)
    return {
      label: "Evidence changed",
      icon: <CircleAlert aria-hidden="true" />,
    };
  if (goal.evaluation.criteriaMet === true)
    return {
      label: "Criteria reached",
      icon: <CircleCheck aria-hidden="true" />,
    };
  if (goal.evaluation.criteriaMet === null)
    return {
      label: "Needs judgment",
      icon: <CircleDashed aria-hidden="true" />,
    };
  return { label: "In progress", icon: <CircleDashed aria-hidden="true" /> };
}

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
  const state = evaluationState(goal);

  return (
    <Link className="direction-goal-row" href={`/direction/goals/${goal.id}`}>
      <div className="direction-goal-main">
        <div className="direction-goal-title-row">
          <h3>{goal.title}</h3>
          <span className="direction-goal-badges">
            <span className="direction-goal-lifecycle">
              {lifecycleLabel(goal)}
            </span>
            <span className="direction-goal-state">
              {state.icon}
              {state.label}
            </span>
          </span>
        </div>
        <p>{goal.progressSummary}</p>
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
