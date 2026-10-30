"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { Textarea } from "@/components/ui/forms/textarea.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { useEffect, useRef, useState } from "react";
import { observationInputSchema } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
import {
  ObservationAudienceAttributionFields,
  type ObservationAudienceAttribution,
} from "@/features/entrepreneurship/observations/components/observation-audience-attribution.component";
import type { AudienceOption } from "@/features/entrepreneurship/audiences/types/audience.types";
type Entry = {
  id: string;
  kind: string;
  wordingMode: string;
  statement: string;
  sourceDescription: string;
  problemId: string;
  stance: string;
  explanation: string;
  audience?: ObservationAudienceAttribution;
  audienceReason?: string;
};
export function ObservationEntries({
  problems,
  segments = [],
}: {
  problems: { id: string; name: string }[];
  segments?: AudienceOption[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const root = useRef<HTMLDivElement>(null);
  function update(
    id: string,
    field: string,
    value: string | ObservationAudienceAttribution | undefined,
  ) {
    setEntries((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    function reveal(id: string) {
      setExpanded((rows) => [...new Set([...rows, id])]);
      requestAnimationFrame(() => {
        const region = root.current?.querySelector<HTMLElement>(
          `[data-entry="${id}"]`,
        );
        region
          ?.querySelectorAll<HTMLDetailsElement>("details")
          .forEach((details) => {
            details.open = true;
          });
        region?.querySelector<HTMLElement>("textarea")?.focus();
      });
    }
    const validate = (event: Event) => {
      const data = new FormData(form!);
      const fallback = String(
        data.get("summary") || data.get("sourceDescription") || "",
      );
      const issues: Record<string, string> = {};
      entries.forEach((entry, i) => {
        const result = observationInputSchema.safeParse({
          ...entry,
          sourceDescription: entry.sourceDescription || fallback,
        });
        if (entry.audience && !entry.audienceReason?.trim()) {
          issues[entry.id] =
            `Observation ${i + 1}: explain why this narrower audience belongs to the source.`;
        } else if (!result.success)
          issues[entry.id] =
            entry.problemId && !entry.explanation.trim()
              ? `Observation ${i + 1}: explain how this statement relates to “${problems.find((p) => p.id === entry.problemId)?.name ?? "the selected problem"}”.`
              : `Observation ${i + 1}: ${result.error.issues[0].message}`;
      });
      setErrors(issues);
      const first = Object.keys(issues)[0];
      if (first) {
        event.preventDefault();
        event.stopImmediatePropagation();
        reveal(first);
      }
    };
    const serverError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      const match = /^Observation (\d+):/.exec(message);
      const entry = match ? entries[Number(match[1]) - 1] : null;
      if (entry) {
        setErrors({ [entry.id]: message });
        reveal(entry.id);
      }
    };
    form.addEventListener("submit", validate, true);
    form.addEventListener("record-form-error", serverError);
    return () => {
      form.removeEventListener("submit", validate, true);
      form.removeEventListener("record-form-error", serverError);
    };
  }, [entries, problems]);
  return (
    <div ref={root} className="business-form-collection">
      <input
        type="hidden"
        name="observations"
        value={JSON.stringify(entries)}
      />
      <p className="business-hint">
        Observations are optional. Keep only the statements or behavior you
        explicitly recorded.
      </p>
      {entries.map((entry, index) => (
        <details
          key={entry.id}
          data-entry={entry.id}
          className="business-disclosure"
          open={expanded.includes(entry.id)}
          onToggle={(e) => {
            const open = e.currentTarget.open;
            setExpanded((rows) =>
              open
                ? [...new Set([...rows, entry.id])]
                : rows.filter((id) => id !== entry.id),
            );
          }}
        >
          <summary>
            Observation {index + 1} ·{" "}
            {entry.statement.slice(0, 80) || "New observation"}
            {errors[entry.id] ? " · Check entry" : ""}
          </summary>
          <div>
            {errors[entry.id] && (
              <p role="alert" className="form-error">
                {errors[entry.id].replace(
                  /^Observation \d+:/,
                  `Observation ${index + 1}:`,
                )}
              </p>
            )}
            <label className="field-label">
              Observation kind
              <NativeSelect
                value={entry.kind}
                onChange={(e) => update(entry.id, "kind", e.target.value)}
              >
                {[
                  "CUSTOMER_STATEMENT",
                  "OBSERVED_BEHAVIOR",
                  "INTEREST",
                  "COMMITMENT",
                  "CONTEXT",
                ].map((kind) => (
                  <option key={kind} value={kind}>
                    {humanize(kind)}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field-label">
              Wording
              <NativeSelect
                value={entry.wordingMode}
                onChange={(e) =>
                  update(entry.id, "wordingMode", e.target.value)
                }
              >
                <option value="PARAPHRASE">Paraphrase</option>
                <option value="QUOTE">Exact quote</option>
              </NativeSelect>
            </label>
            <label className="field-label">
              Statement or behavior
              <Textarea
                value={entry.statement}
                onChange={(e) => update(entry.id, "statement", e.target.value)}
              />
            </label>
            <label className="field-label">
              Source excerpt or context
              <Textarea
                value={entry.sourceDescription}
                onChange={(e) =>
                  update(entry.id, "sourceDescription", e.target.value)
                }
              />
              <span className="business-hint">
                Blank keeps the interaction summary or outcome source
                description.
              </span>
            </label>
            <details className="business-disclosure">
              <summary>Audience attribution</summary>
              <div>
                <label className="business-choice-row">
                  <input
                    type="checkbox"
                    checked={Boolean(entry.audience)}
                    onChange={(event) =>
                      update(
                        entry.id,
                        "audience",
                        event.target.checked
                          ? {
                              marketType: "UNKNOWN",
                              segmentIds: [],
                              audienceDescription: "",
                            }
                          : undefined,
                      )
                    }
                  />
                  This observation concerns a narrower audience
                </label>
                {entry.audience ? (
                  <ObservationAudienceAttributionFields
                    value={entry.audience}
                    reason={entry.audienceReason ?? ""}
                    segments={segments}
                    onChange={(value) => update(entry.id, "audience", value)}
                    onReasonChange={(value) =>
                      update(entry.id, "audienceReason", value)
                    }
                  />
                ) : (
                  <p className="business-hint">
                    Keeps the interaction or outcome&apos;s audience and source
                    identity.
                  </p>
                )}
              </div>
            </details>
            <label className="field-label">
              Related problem · optional
              <NativeSelect
                value={entry.problemId}
                onChange={(e) => update(entry.id, "problemId", e.target.value)}
              >
                <option value="">Keep without a problem link</option>
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field-label">
              Relationship to problem
              <NativeSelect
                value={entry.stance}
                onChange={(e) => update(entry.id, "stance", e.target.value)}
              >
                {["CONTEXT", "SUPPORTS", "CONTRADICTS"].map((stance) => (
                  <option key={stance} value={stance}>
                    {humanize(stance)}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field-label">
              Your interpretation
              <Textarea
                value={entry.explanation}
                onChange={(e) =>
                  update(entry.id, "explanation", e.target.value)
                }
              />
            </label>
            <div className="business-actions">
              <Button
                variant="ghost"
                size="sm"
                type="button"

                onClick={() =>
                  setEntries((rows) => rows.filter((r) => r.id !== entry.id))
                }
                aria-label={`Remove observation ${index + 1}`}
              >
                Remove observation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"

                disabled={!index}
                onClick={() =>
                  setEntries((rows) => {
                    const next = [...rows];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    return next;
                  })
                }
              >
                Move observation up
              </Button>
            </div>
          </div>
        </details>
      ))}
      <Button
        variant="secondary"
        type="button"

        disabled={entries.length >= 30}
        onClick={() => {
          const id = crypto.randomUUID();
          setEntries((rows) => [
            ...rows,
            {
              id,
              kind: "CUSTOMER_STATEMENT",
              wordingMode: "PARAPHRASE",
              statement: "",
              sourceDescription: "",
              problemId: "",
              stance: "CONTEXT",
              explanation: "",
            },
          ]);
          setExpanded((rows) => [...rows, id]);
        }}
      >
        Add observation
      </Button>
    </div>
  );
}
