"use client";
import type {
  FinanceActivityKind,
  FinanceCompensationType,
} from "@/generated/prisma/enums";
import type {
  FinanceSessionInput,
  FinanceWorkOptions,
} from "@/features/finance/sessions/types/finance-session.types";
import { FinanceSelect } from "@/features/finance/components/finance-field.component";

const compensationOptions: Array<{
  value: FinanceCompensationType;
  label: string;
}> = [
  { value: "HOURLY", label: "Hourly" },
  { value: "FIXED", label: "Fixed fee" },
  { value: "TASK_BASED", label: "Task based" },
  { value: "UNKNOWN", label: "Not specified" },
];

export function FinanceTimerFields({
  kind,
  options,
  value,
  onChange,
}: {
  kind: FinanceActivityKind | null;
  options: FinanceWorkOptions;
  value: FinanceSessionInput;
  onChange: (value: FinanceSessionInput) => void;
}) {
  if (!kind || kind === "FINANCE_ADMIN") return null;
  return (
    <div className="gap-lg grid sm:grid-cols-2">
      {kind === "PAID_WORK" && (
        <>
          <FinanceSelect
            label="Work source (optional)"
            value={value.workSourceId}
            onChange={(event) => {
              const source = options.workSources.find(
                (source) => source.id === event.target.value,
              );
              onChange({
                ...value,
                workSourceId: event.target.value,
                financeCompensationType:
                  source?.defaultCompensationType ?? "UNKNOWN",
              });
            }}
          >
            <option value="">Unassigned</option>
            {options.workSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </FinanceSelect>
          <FinanceSelect
            label="Compensation type"
            value={value.financeCompensationType}
            onChange={(event) =>
              onChange({
                ...value,
                financeCompensationType: event.target
                  .value as FinanceCompensationType,
              })
            }
          >
            {compensationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FinanceSelect>
        </>
      )}
      <FinanceSelect
        label={
          kind === "APPLICATION" || kind === "ASSESSMENT"
            ? "Opportunity (recommended)"
            : "Opportunity (optional)"
        }
        value={value.incomeOpportunityId}
        onChange={(event) =>
          onChange({ ...value, incomeOpportunityId: event.target.value })
        }
      >
        <option value="">Unassigned</option>
        {options.opportunities.map((opportunity) => (
          <option key={opportunity.id} value={opportunity.id}>
            {opportunity.title}
          </option>
        ))}
      </FinanceSelect>
    </div>
  );
}
