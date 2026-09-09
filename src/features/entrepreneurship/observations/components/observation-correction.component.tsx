"use client";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  BusinessField,
  BusinessFormSection,
} from "@/features/entrepreneurship/shared/components/business-field.component";
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
        <BusinessFormSection
          eyebrow="Recorded source"
          title="Correct the source words"
          description={`Previously recorded: ${statement}`}
        >
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
        </BusinessFormSection>
        <BusinessFormSection eyebrow="Audit trail" title="Explain the change">
          <BusinessField
            label="Reason for correction"
            name="correctionReason"
            multiline
            required
          />
          <label className="business-choice-row">
            <input type="checkbox" name="meaningUnchanged" />
            Only wording changed. The source meaning and interpretation are
            unchanged.
          </label>
        </BusinessFormSection>
        <p className="business-form-note">
          If the source or company itself was wrong, withdraw this observation
          and record the correct source separately.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
