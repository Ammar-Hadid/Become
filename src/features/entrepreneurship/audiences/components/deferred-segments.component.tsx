"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";

/** Segment definitions are committed with the enclosing record, never on cancellation. */
export function DeferredSegments({
  fieldName = "segmentNames",
  onChange,
}: {
  fieldName?: string | null;
  onChange?: (names: string[]) => void;
}) {
  const id = useId();
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  function update(nextNames: string[], nextDraft: string) {
    setNames(nextNames);
    setDraft(nextDraft);
    onChange?.([...nextNames, ...(nextDraft.trim() ? [nextDraft.trim()] : [])]);
  }
  return (
    <details className="text-body-sm text-text-secondary">
      <summary className="rounded-control py-sm cursor-pointer">
        Describe a new segment
      </summary>
      <div className="gap-sm mt-sm grid">
        {names.length > 0 && (
          <ul
            className="gap-sm flex flex-wrap"
            aria-label="New segments to save"
          >
            {names.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="gap-sm rounded-control border-border px-md py-sm flex items-center border"
              >
                {name}
                <button
                  type="button"
                  className="rounded-control p-xs hover:text-text-primary focus-visible:outline-primary focus-visible:outline-2"
                  aria-label={`Remove new segment ${name}`}
                  onClick={() =>
                    update(
                      names.filter((_, i) => i !== index),
                      draft,
                    )
                  }
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor={id} className="field-label">
          New segment name
        </label>
        <div className="gap-sm flex items-center">
          <input
            id={id}
            className="text-input min-w-0 flex-1"
            value={draft}
            maxLength={160}
            placeholder="For example, competitive cloth-mousepad users"
            onChange={(event) => update(names, event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!draft.trim()}
            aria-label="Add another new segment"
            onClick={() => update([...names, draft.trim()], "")}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-body-sm text-text-muted">
          Created and attached when you save this record. Cancelling creates
          nothing. Add a fuller definition in Audience later.
        </p>
        {fieldName &&
          [...names, ...(draft.trim() ? [draft.trim()] : [])].map(
            (name, index) => (
              <input key={index} type="hidden" name={fieldName} value={name} />
            ),
          )}
      </div>
    </details>
  );
}
