"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type { CarryForwardSuggestion } from "@/features/reviews/contracts/types/review.types";
import styles from "../styles/season-carry-forward.module.css";

export function SeasonCarryForward({
  suggestion,
  current,
  onApply,
  disabled,
  storageScope,
}: {
  suggestion: CarryForwardSuggestion;
  current: { carryForward: string; leaveBehind: string };
  onApply: (patch: Partial<typeof current>) => void;
  disabled: boolean;
  storageScope: string | null;
}) {
  const [entries, setEntries] = useState({
    carryForward: suggestion.carryForward,
    leaveBehind: suggestion.leaveBehind,
  });
  const [selected, setSelected] = useState({
    carryForward: Boolean(suggestion.carryForward),
    leaveBehind: Boolean(suggestion.leaveBehind),
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draftKey = storageScope
    ? `become:carry-suggestion:${storageScope}:${suggestion.editionId}`
    : null;
  const fields = [
    { key: "carryForward", label: "Carry forward" },
    { key: "leaveBehind", label: "Leave behind" },
  ] as const;
  const hasSelection = fields.some(
    ({ key }) => selected[key] && entries[key].trim(),
  );
  const hasExisting = fields.some(
    ({ key }) => selected[key] && entries[key].trim() && current[key].trim(),
  );

  useEffect(() => {
    if (!draftKey) return;
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
        if (
          !saved ||
          typeof saved !== "object" ||
          !saved.entries ||
          !saved.selected ||
          !["carryForward", "leaveBehind"].every(
            (key) =>
              typeof saved.entries[key] === "string" &&
              saved.entries[key].length <= 6000 &&
              typeof saved.selected[key] === "boolean",
          )
        )
          return;
        setEntries(saved.entries);
        setSelected(saved.selected);
        setNotice("Your unadded suggestion edits are kept in this tab.");
      } catch {
        /* Original saved words remain available when no local copy can load. */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [draftKey]);

  function keepSuggestion(
    nextEntries: typeof entries,
    nextSelected: typeof selected,
  ) {
    try {
      if (!draftKey) throw new Error("No scoped local draft is available.");
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ entries: nextEntries, selected: nextSelected }),
      );
      setError(null);
    } catch {
      setError(
        "Unadded edits could not be kept in this tab. Add the selected words to the opening fields to preserve them when leaving.",
      );
    }
  }

  function apply(append: boolean) {
    const patch: Partial<typeof current> = {};
    for (const { key } of fields) {
      if (!selected[key] || !entries[key].trim()) continue;
      patch[key] =
        append && current[key].trim()
          ? `${current[key].trim()}\n\n${entries[key].trim()}`
          : entries[key].trim();
      if (patch[key]!.length > 6000) {
        setError(
          "These entries exceed the field limit together. Edit the selection or your current words before adding them.",
        );
        return;
      }
    }
    onApply(patch);
    setError(null);
    setNotice(
      "Selected words added to this opening. Review them in the fields below; they save with your Season draft.",
    );
  }

  return (
    <aside className={styles.suggestions} aria-labelledby="season-carry-title">
      <header>
        <div>
          <p className="eyebrow">From {suggestion.label}</p>
          <h3 id="season-carry-title">Choose what comes with you.</h3>
          <p>
            Your saved closing words are suggestions. Select and edit them
            before adding anything to this opening. Unadded edits stay in this
            tab.
          </p>
        </div>
        <Link href={suggestion.reviewHref}>
          Read the closing review <ArrowRight aria-hidden="true" />
        </Link>
      </header>
      {(suggestion.carryForward || suggestion.leaveBehind) && (
        <>
          <fieldset disabled={disabled} className={styles.fields}>
            {fields
              .filter(({ key }) => suggestion[key])
              .map(({ key, label }) => (
                <div key={key}>
                  <label className={styles.choice}>
                    <input
                      type="checkbox"
                      name={`suggestion-${key}-selected`}
                      checked={selected[key]}
                      onChange={(event) => {
                        const next = {
                          ...selected,
                          [key]: event.target.checked,
                        };
                        setSelected(next);
                        keepSuggestion(entries, next);
                      }}
                    />
                    <span>{label}</span>
                  </label>
                  <textarea
                    aria-label={`Edit ${label.toLowerCase()} suggestion`}
                    name={`suggestion-${key}`}
                    value={entries[key]}
                    maxLength={6000}
                    onChange={(event) => {
                      const next = { ...entries, [key]: event.target.value };
                      setEntries(next);
                      keepSuggestion(next, selected);
                    }}
                  />
                </div>
              ))}
          </fieldset>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || !hasSelection}
              onClick={() => apply(hasExisting)}
            >
              <Check aria-hidden="true" />
              {hasExisting ? "Append selected words" : "Use selected words"}
            </Button>
            {hasExisting && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || !hasSelection}
                onClick={() => apply(false)}
              >
                Replace selected fields
              </Button>
            )}
          </div>
        </>
      )}
      {suggestion.unfinished.length > 0 && (
        <details className={styles.unfinished}>
          <summary>Unfinished intentions you can reconsider</summary>
          <ul>
            {suggestion.unfinished.map((intention) => (
              <li key={intention.id}>
                <Link href={intention.href}>
                  {intention.title}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p>
            These are the original goals and experiments. Choose their role in
            Direction; their own dates and conclusions remain yours to manage.
          </p>
        </details>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
