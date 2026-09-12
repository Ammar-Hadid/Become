"use client";

import { GoalEditor } from "@/features/direction/goals/components/goal-editor.component";
import type { OwnedOption } from "@/features/direction/types/direction.types";

export type SeasonGoalPlacement = "PRIMARY" | "SUPPORTING";

export function SeasonGoalCreator({
  domainOptions,
  defaultStartOn,
  placement,
  onPlacementChange,
  onCancel,
  onCreated,
}: {
  domainOptions: OwnedOption[];
  defaultStartOn: string;
  placement: SeasonGoalPlacement;
  onPlacementChange: (placement: SeasonGoalPlacement) => void;
  onCancel: () => void;
  onCreated: (goal: OwnedOption, placement: SeasonGoalPlacement) => void;
}) {
  return (
    <section
      className="season-goal-creator season-opening-stage"
      aria-label="Create a goal within the opening ritual"
    >
      <div className="season-goal-creator-context">
        <div>
          <p className="eyebrow">Opening ritual · Choose direction</p>
          <p>Your place in the opening is held while you shape this goal.</p>
        </div>
        <fieldset>
          <legend className="field-label">Place in this season</legend>
          <div>
            {(["PRIMARY", "SUPPORTING"] as const).map((role) => (
              <label key={role}>
                <input
                  type="radio"
                  name="seasonGoalPlacement"
                  value={role}
                  checked={placement === role}
                  onChange={() => onPlacementChange(role)}
                />
                <span>
                  {role === "PRIMARY" ? "Main direction" : "Supporting goal"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <GoalEditor
        presentation="ritual"
        domainOptions={domainOptions}
        defaultStartOn={defaultStartOn}
        onCancel={onCancel}
        onCreated={(goal) => onCreated(goal, placement)}
      />
    </section>
  );
}
