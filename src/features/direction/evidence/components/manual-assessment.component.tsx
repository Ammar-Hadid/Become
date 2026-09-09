"use client";

import { CheckCircle2, FileCheck2 } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  ReusableEntityCombobox,
  type ReusableEntityOption,
} from "@/components/ui/forms/reusable-entity-combobox.component";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import { searchDirectionOptions } from "@/features/direction/options/utils/direction-option-client.util";
import type { CriterionEvaluation } from "@/features/direction/types/direction.types";

type EvidenceType =
  | "INTERACTION"
  | "SESSION"
  | "ENGINEERING_EVIDENCE"
  | "TRANSACTION"
  | "OFFER_REVISION";

type AssessmentSource = { type: EvidenceType; option: ReusableEntityOption };

const sourceTypes: {
  value: EvidenceType;
  label: string;
  optionKind:
    | "interaction"
    | "session"
    | "engineeringEvidence"
    | "transaction"
    | "offerRevision";
}[] = [
  {
    value: "INTERACTION",
    label: "Conversation or outreach",
    optionKind: "interaction",
  },
  { value: "SESSION", label: "Completed session", optionKind: "session" },
  {
    value: "ENGINEERING_EVIDENCE",
    label: "Engineering evidence",
    optionKind: "engineeringEvidence",
  },
  {
    value: "TRANSACTION",
    label: "Finance transaction",
    optionKind: "transaction",
  },
  {
    value: "OFFER_REVISION",
    label: "Offer revision",
    optionKind: "offerRevision",
  },
];

function todayInAmsterdam() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function ManualAssessment({
  criterion,
  ownerVersion,
  ownerStatus,
}: {
  criterion: CriterionEvaluation;
  ownerVersion: number;
  ownerStatus: "ACTIVE" | "PAUSED" | "CONCLUDED";
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const runStable = useStableOperation();
  const [sourceType, setSourceType] = useState<EvidenceType>("INTERACTION");
  const [sources, setSources] = useState<AssessmentSource[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const sourceDefinition = sourceTypes.find(
    ({ value }) => value === sourceType,
  )!;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const identity = {
      type: "ASSESS_CRITERION" as const,
      criterionId: criterion.id,
      expectedVersion: ownerVersion,
      confirmed: data.get("confirmed") === "true",
      rationale: String(data.get("rationale") ?? ""),
      assessedOn: String(data.get("assessedOn") ?? ""),
      sources: sources.map(({ type, option }) => ({ type, id: option.id })),
    };
    const result = await runStable(identity, (operationKey) =>
      sendDirectionCommand({ ...identity, operationKey }),
    );
    setPending(false);
    setError(result.recoveredPrevious ? null : result.error);
    setFieldErrors(result.fieldErrors ?? {});
    if (!result.error || result.recoveredPrevious) {
      markSaved();
      setSources([]);
      router.refresh();
    }
  }

  if (ownerStatus === "CONCLUDED") return null;

  return (
    <details className="direction-assessment">
      <summary>
        <FileCheck2 aria-hidden="true" /> Record your dated assessment
      </summary>
      <form ref={formRef} onSubmit={submit}>
        <p>
          This judgment does not overwrite domain totals. If the criterion or
          cited source changes later, Become will ask for review.
        </p>
        <fieldset className="direction-assessment-choice">
          <legend className="field-label">Your judgment</legend>
          <label>
            <input type="radio" name="confirmed" value="true" required />
            <span>
              <CheckCircle2 aria-hidden="true" /> This outcome is established
            </span>
          </label>
          <label>
            <input type="radio" name="confirmed" value="false" required />
            <span>This outcome is not established</span>
          </label>
        </fieldset>
        <label>
          <span className="field-label">Assessment date</span>
          <input
            className="text-input"
            type="date"
            name="assessedOn"
            defaultValue={todayInAmsterdam()}
            required
            aria-invalid={Boolean(fieldErrors.assessedOn) || undefined}
          />
        </label>
        <label>
          <span className="field-label">Rationale</span>
          <textarea
            className="text-input text-input--textarea-sm"
            name="rationale"
            required
            maxLength={6000}
            aria-invalid={Boolean(fieldErrors.rationale) || undefined}
            placeholder="What makes this your honest judgment?"
          />
        </label>
        <div className="direction-assessment-sources">
          <label>
            <span className="field-label">Evidence source type</span>
            <span className="select-wrap">
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as EvidenceType)
                }
              >
                {sourceTypes.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <ReusableEntityCombobox
            label="Supporting records"
            entityName="source"
            idFieldName="assessmentSourceIds"
            queryFieldName="assessmentSourceSearch"
            options={sources
              .filter(({ type }) => type === sourceType)
              .map(({ option }) => option)}
            selectedOptions={sources
              .filter(({ type }) => type === sourceType)
              .map(({ option }) => option)}
            onSelectionChange={(options) =>
              setSources((current) => [
                ...current.filter(({ type }) => type !== sourceType),
                ...options.map((option) => ({ type: sourceType, option })),
              ])
            }
            searchAction={(query) =>
              searchDirectionOptions(sourceDefinition.optionKind, query)
            }
            placeholder={`Search ${sourceDefinition.label.toLowerCase()}…`}
          />
          {sources.length > 0 && (
            <p>
              {sources.length} exact{" "}
              {sources.length === 1 ? "record" : "records"} selected across
              source types.
            </p>
          )}
        </div>
        <p className="direction-field-hint">
          You may save an assessment without linked records when the rationale
          itself is the appropriate qualitative evidence. A new assessment
          stores only the sources selected here.
        </p>
        {error && (
          <p className="season-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="direction-assessment-actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving assessment…" : "Save assessment"}
          </Button>
        </div>
      </form>
    </details>
  );
}
