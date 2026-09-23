"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { BusinessRecordPicker } from "@/features/entrepreneurship/shared/components/business-record-picker.component";
import { addCompanyToExplorationAction } from "@/features/entrepreneurship/market/actions/market.action";
export function ExplorationCompanyForm() {
  const exploration = useExploration();
  if (!exploration || exploration.archived) return null;
  return (
    <RecordDialog
      eyebrow="Company context"
      title="Attach an existing business"
      triggerLabel="Attach existing business"
      variant="secondary"
      description={`Explore a business you already know in ${exploration.name}.`}
    >
      <RecordForm
        action={addCompanyToExplorationAction.bind(null, exploration.id)}
        submitLabel="Attach to exploration"
        closeOnSuccess
      >
        <BusinessRecordPicker
          kind="company"
          label="Business"
          name="companyId"
          options={[]}
          placeholder="Find an existing business…"
          required
        />
        <p className="business-hint">
          Only its company context is shared. Previous conversations and offers
          keep the exploration in which they were recorded.
        </p>
      </RecordForm>
    </RecordDialog>
  );
}
