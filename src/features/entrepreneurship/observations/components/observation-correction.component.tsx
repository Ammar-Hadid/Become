"use client";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { BusinessField } from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import { correctObservationAction } from "@/features/entrepreneurship/observations/actions/observation.action";
export function ObservationCorrection({
  id,
  version,
  statement,
  sourceDescription,
  date,
}: {
  id: string;
  version: number;
  statement: string;
  sourceDescription: string;
  date: string;
}) {
  return (
    <RecordDialog
      eyebrow="A source correction"
      triggerLabel="Correct wording or date"
      title="Correct the observation"
      variant="secondary"
      description="The earlier version remains available to every assessment that used it. A material correction marks affected interpretations for review."
    >
      <RecordForm
        action={correctObservationAction.bind(null, id, version)}
        closeOnSuccess
        submitLabel="Save correction"
      >
        <CaptureKey />
        <p className="business-hint">Previously recorded: {statement}</p>
        <BusinessField
          label="Statement or behavior"
          name="statement"
          multiline
          required
          value={statement}
        />
        <BusinessField
          label="Source excerpt or context"
          name="sourceDescription"
          multiline
          required
          value={sourceDescription}
        />
        <BusinessField
          label="Date observed"
          name="observedAt"
          type="date"
          required
          value={date}
        />
        <BusinessField
          label="Reason for correction"
          name="correctionReason"
          multiline
          required
        />
        <label className="business-hint gap-sm flex">
          <input type="checkbox" name="meaningUnchanged" />
          Only wording changed. The source meaning and interpretation are
          unchanged.
        </label>
        <p className="business-hint">
          If the source or company itself was wrong, withdraw this observation
          and record the correct source separately.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
