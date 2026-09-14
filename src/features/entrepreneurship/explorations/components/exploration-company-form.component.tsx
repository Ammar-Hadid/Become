"use client";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { ReusableEntityCombobox } from "@/components/ui/forms/reusable-entity-combobox.component";
import { searchCompaniesAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
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
        <ReusableEntityCombobox
          label="Business"
          entityName="business"
          idFieldName="companyId"
          queryFieldName="companyName"
          options={[]}
          searchAction={searchCompaniesAction}
          placeholder="Find an existing business…"
          optional={false}
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
