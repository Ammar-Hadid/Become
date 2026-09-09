"use client";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import { useRouter } from "next/navigation";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { saveOpportunityAction } from "@/features/finance/opportunities/actions/income-opportunity.action";
export type OpportunityFormValues = {
  id?: string;
  title: string;
  organizationName?: string | null;
  status: string;
  channel?: string | null;
  discoveredAt: string;
  appliedAt?: string;
  assessmentAt?: string;
  closedAt?: string;
  compensationType?: string | null;
  expectedAmount?: string;
  expectedCurrency?: string | null;
  notes?: string | null;
};
export function OpportunityForm({
  initial,
}: {
  initial: OpportunityFormValues;
}) {
  const router = useRouter();
  return (
    <FinanceForm
      action={saveOpportunityAction}
      submitLabel="Save opportunity"
      onSaved={(state) => {
        if (state.id) router.push(`/finance/opportunities/${state.id}`);
      }}
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FinanceField
        label="Opportunity title"
        name="title"
        placeholder="e.g. Product role, freelance brief, client lead"
        required
        defaultValue={initial.title}
      />
      <div className="finance-form-grid">
        <FinanceField
          label="Organization"
          name="organizationName"
          placeholder="Who might this become work with?"
          defaultValue={initial.organizationName ?? ""}
        />
        <FinanceSelect
          label="Status"
          name="status"
          defaultValue={initial.status}
        >
          <option value="DISCOVERED">Discovered</option>
          <option value="APPLIED">Applied</option>
          <option value="ASSESSMENT">In assessment</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Not selected</option>
          <option value="ABANDONED">Closed by me</option>
        </FinanceSelect>
      </div>
      <FinanceSelect
        label="How did it reach you?"
        aria-label="Channel"
        name="channel"
        defaultValue={initial.channel ?? "OTHER"}
      >
        <option value="DIRECT">Direct</option>
        <option value="REFERRAL">Referral</option>
        <option value="JOB_BOARD">Job board</option>
        <option value="MARKETPLACE">Marketplace</option>
        <option value="OUTREACH">Outreach</option>
        <option value="OTHER">Other</option>
      </FinanceSelect>
      <FinanceField
        label="Discovered at (Amsterdam)"
        name="discoveredAt"
        type="datetime-local"
        defaultValue={initial.discoveredAt}
        required
      />
      <details className="finance-details">
        <summary>Milestones and prospective compensation</summary>
        <div className="finance-details-body space-y-lg">
          {[
            ["appliedAt", "Applied at"],
            ["assessmentAt", "Assessment at"],
            ["closedAt", "Closed at"],
          ].map(([name, label]) => (
            <FinanceField
              key={name}
              label={`${label} (Amsterdam)`}
              name={name}
              type="datetime-local"
              defaultValue={
                initial[name as "appliedAt" | "assessmentAt" | "closedAt"] ?? ""
              }
            />
          ))}
          <FinanceSelect
            label="Compensation type"
            name="compensationType"
            defaultValue={initial.compensationType ?? "UNKNOWN"}
          >
            <option value="HOURLY">Hourly</option>
            <option value="FIXED">Fixed amount</option>
            <option value="TASK_BASED">Task based</option>
            <option value="UNKNOWN">Not known yet</option>
          </FinanceSelect>
          <FinanceField
            label="Expected amount (prospective only)"
            name="expectedAmount"
            inputMode="decimal"
            defaultValue={initial.expectedAmount ?? ""}
          />
          <p className="finance-form-note">
            Expected compensation stays prospective. It never counts as received
            income.
          </p>
          <CurrencySelect
            label="Expected currency"
            name="expectedCurrency"
            defaultValue={initial.expectedCurrency ?? ""}
          />
        </div>
      </details>
      <FinanceField
        label="Notes"
        name="notes"
        defaultValue={initial.notes ?? ""}
      />
    </FinanceForm>
  );
}
