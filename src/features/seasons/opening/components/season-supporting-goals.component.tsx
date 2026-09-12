"use client";

import { Minus, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";

function SeasonSupportingGoalSelection({
  goal,
  note,
  onNoteChange,
  onRemove,
}: {
  goal: ReusableEntityOption;
  note: string;
  onNoteChange: (value: string) => void;
  onRemove: () => void;
}) {
  const noteId = useId();
  const [expanded, setExpanded] = useState(() => Boolean(note.trim()));
  const { isPresent, presenceState, onPresenceAnimationEnd } =
    usePresence(expanded);

  return (
    <div className="season-supporting-goal" role="listitem">
      <div className="season-supporting-goal-chip">
        <span className="season-supporting-goal-name" title={goal.name}>
          {goal.name}
        </span>
        <button
          type="button"
          className="season-supporting-goal-context-toggle"
          aria-expanded={expanded}
          aria-controls={noteId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <Minus aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {expanded ? "Hide context" : "Add context"}
        </button>
        <button
          type="button"
          className="season-supporting-goal-remove"
          aria-label={`Remove ${goal.name} from supporting goals`}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {isPresent && (
        <div
          id={noteId}
          className="season-supporting-goal-note"
          data-state={presenceState}
          aria-hidden={presenceState === "closed" || undefined}
          onAnimationEnd={onPresenceAnimationEnd}
        >
          <div className="season-supporting-goal-note-inner">
            <label>
              <span className="field-label">
                How this goal supports the season — optional
              </span>
              <input
                className="text-input"
                value={note}
                tabIndex={presenceState === "closed" ? -1 : undefined}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="A short reason or role is enough…"
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function SeasonSupportingGoals({
  options,
  selectedOptions,
  notes,
  onSelectionChange,
  onNoteChange,
}: {
  options: ReusableEntityOption[];
  selectedOptions: ReusableEntityOption[];
  notes: Record<string, string>;
  onSelectionChange: (options: ReusableEntityOption[]) => void;
  onNoteChange: (goalId: string, value: string) => void;
}) {
  return (
    <ReusableEntityCombobox
      label="Supporting goals"
      entityName="goal"
      idFieldName="supportingGoalIds"
      queryFieldName="supportingGoalSearch"
      options={options}
      searchAction={(query) => searchDirectionOptions("goal", query)}
      selectedOptions={selectedOptions}
      selectedOptionsDisplay={
        selectedOptions.length ? (
          <div
            className="season-supporting-goal-list"
            role="list"
            aria-label="Selected supporting goals"
          >
            {selectedOptions.map((goal) => (
              <SeasonSupportingGoalSelection
                key={goal.id}
                goal={goal}
                note={notes[goal.id] ?? ""}
                onNoteChange={(value) => onNoteChange(goal.id, value)}
                onRemove={() =>
                  onSelectionChange(
                    selectedOptions.filter((option) => option.id !== goal.id),
                  )
                }
              />
            ))}
          </div>
        ) : null
      }
      onSelectionChange={onSelectionChange}
      placeholder="Add another outcome…"
    />
  );
}
