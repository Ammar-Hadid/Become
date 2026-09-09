"use client";
import { useState } from "react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  BusinessField,
  BusinessFormSection,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { linkCompanyWorkSourceAction } from "@/features/entrepreneurship/market/actions/market.action";
export function WorkSourceChoiceFields({
  workSources,
  companyName,
}: {
  workSources: { id: string; name: string }[];
  companyName?: string;
}) {
  const [mode, setMode] = useState("CREATE");
  return (
    <>
      <BusinessFormSection
        eyebrow="Finance connection"
        title="Choose the work relationship"
        description="Create a new source or connect one that already exists."
      >
        <label className="field-label">
          WorkSource action
          <select
            className="text-input mt-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="CREATE">Create a WorkSource</option>
            <option value="LINK">Link an existing WorkSource</option>
          </select>
        </label>
        {mode === "CREATE" ? (
          <BusinessField
            label="New WorkSource name"
            name="name"
            value={companyName}
            required
          />
        ) : (
          <BusinessSelect
            label="Existing WorkSource"
            name="workSourceId"
            required
          >
            <option value="">Choose an existing WorkSource</option>
            {workSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </BusinessSelect>
        )}
        <p className="business-hint">
          This saves the work relationship. Income history remains unattributed
          until you explicitly attribute a receipt.
        </p>
      </BusinessFormSection>
    </>
  );
}
export function CompanyWorkSourceForm({
  companyId,
  companyName,
  workSources,
}: {
  companyId: string;
  companyName: string;
  workSources: { id: string; name: string }[];
}) {
  return (
    <RecordDialog
      eyebrow="Work relationship"
      triggerLabel="Create / Link WorkSource"
      title="Connect a WorkSource"
      variant="secondary"
      description={`Connect paid work with ${companyName}.`}
    >
      <RecordForm
        action={linkCompanyWorkSourceAction.bind(null, companyId)}
        closeOnSuccess
        submitLabel="Confirm WorkSource connection"
      >
        <CaptureKey />
        <WorkSourceChoiceFields
          workSources={workSources}
          companyName={companyName}
        />
      </RecordForm>
    </RecordDialog>
  );
}
