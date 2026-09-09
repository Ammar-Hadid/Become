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
      title="Add an existing company"
      triggerLabel="Add existing company"
      variant="secondary"
      description={`Explore a company you already know in ${exploration.name}.`}
    >
      <RecordForm
        action={addCompanyToExplorationAction.bind(null, exploration.id)}
        submitLabel="Add to exploration"
        closeOnSuccess
      >
        <ReusableEntityCombobox
          label="Company"
          entityName="company"
          idFieldName="companyId"
          queryFieldName="companyName"
          options={[]}
          searchAction={searchCompaniesAction}
          placeholder="Find an existing company…"
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
