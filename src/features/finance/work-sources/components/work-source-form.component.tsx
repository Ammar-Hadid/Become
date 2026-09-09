import Link from "next/link";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { saveWorkSourceAction } from "@/features/finance/work-sources/actions/work-source.action";
export function WorkSourceForm({
  initial,
  action = saveWorkSourceAction,
  opportunityId,
}: {
  initial?: {
    id?: string;
    name: string;
    type: string;
    defaultCompensationType: string;
    notes?: string | null;
  };
  action?: typeof saveWorkSourceAction;
  opportunityId?: string;
}) {
  return (
    <FinanceForm
      action={action}
      closeOnSuccess
      submitLabel={
        initial?.id ? "Save work source" : "Confirm create work source"
      }
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {opportunityId && (
        <input type="hidden" name="opportunityId" value={opportunityId} />
      )}
      <FinanceField
        label="Work source name"
        name="name"
        placeholder="e.g. Studio North, Employer, Upwork"
        defaultValue={initial?.name ?? ""}
        required
      />
      <FinanceSelect
        label="Source type"
        name="type"
        defaultValue={initial?.type ?? "OTHER"}
      >
        <option value="EMPLOYER">Employer</option>
        <option value="CLIENT">Client</option>
        <option value="PLATFORM">Platform</option>
        <option value="OTHER">Other relationship</option>
      </FinanceSelect>
      <FinanceSelect
        label="Default compensation"
        name="defaultCompensationType"
        defaultValue={initial?.defaultCompensationType ?? "UNKNOWN"}
      >
        <option value="HOURLY">Hourly</option>
        <option value="FIXED">Fixed amount</option>
        <option value="TASK_BASED">Task based</option>
        <option value="UNKNOWN">Varies / not known</option>
      </FinanceSelect>
      <FinanceField
        label="Notes"
        name="notes"
        defaultValue={initial?.notes ?? ""}
      />
      <p className="finance-form-note">
        After saving, to connect this WorkSource to a company, open{" "}
        <Link
          className="business-text-link"
          href="/entrepreneurship/market"
          target="_blank"
        >
          Market ↗
        </Link>
        , choose the company, then “Create / Link WorkSource” → “Link an
        existing WorkSource”.
      </p>
      <p className="finance-form-note">
        This becomes available when recording paid-work sessions and linking
        received income.
      </p>
    </FinanceForm>
  );
}
