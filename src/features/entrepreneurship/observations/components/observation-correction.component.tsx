"use client";
import { useState } from "react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import {
  BusinessField,
  BusinessFormSection,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import { correctObservationAction } from "@/features/entrepreneurship/observations/actions/observation.action";
import {
  AudienceFields,
  AudienceSummary,
  type AudienceFieldValue,
  type AudienceOption,
} from "@/features/entrepreneurship/audiences/components/audience-fields.component";
export function ObservationCorrection({
  id,
  version,
  statement,
  sourceDescription,
  date,
  audience,
  segments = [],
}: {
  id: string;
  version: number;
  statement: string;
  sourceDescription: string;
  date: string;
  audience?: AudienceFieldValue;
  segments?: AudienceOption[];
}) {
  const [audienceOverride, setAudienceOverride] = useState(false);
  return (
    <RecordDialog
      eyebrow="A source correction"
      triggerLabel="Correct observation"
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
        <details className="business-disclosure">
          <summary>Audience correction</summary>
          <div>
            {audience && (
              <p className="business-hint">
                <AudienceSummary {...audience} />
              </p>
            )}
            <label className="business-choice-row">
              <input
                type="checkbox"
                name="audienceOverride"
                checked={audienceOverride}
                onChange={(event) => setAudienceOverride(event.target.checked)}
              />
              Correct the audience attributed to this observation
            </label>
            {audienceOverride && (
              <AudienceFields
                target
                open
                segments={segments}
                value={audience}
              />
            )}
            <p className="business-hint">
              The correction reason below should explain this boundary. The
              recorded source identity stays attached.
            </p>
          </div>
        </details>
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
          If the source identity itself was wrong, withdraw this observation and
          record the correct source separately.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
